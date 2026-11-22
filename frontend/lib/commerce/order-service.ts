// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 11: SERVER-SIDE ORDER & LIFECYCLE SERVICE
// Framework: Next.js 16 + TypeScript
// Integration: PostgreSQL 16 (Commerce) + SQLite (Identity/Auth)
// ==============================================================================

import * as crypto from 'node:crypto';
import { getCommerceDb } from './db';
import { PricingEngine } from './pricing';
import { PayUService } from './payu';
import { CouponService } from './coupon-service';
import { InvoiceService } from './invoice-service';
import {
  OrderEntity,
  PaymentAttemptEntity,
  PayUInitiationParams,
  OrderItemEntity,
  PaymentEntity,
  RefundEntity,
} from './types';

export interface CreateOrderInput {
  userId: number; // Authentic SQLite User ID
  courseId: string;
  couponCode?: string;
  billingFullName: string;
  billingEmail: string;
  billingPhone?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingStateCode: string; // Mandatory 2-letter state code e.g. 'KA'
  billingPostalCode?: string;
}

export interface CreateOrderOutput {
  order: OrderEntity;
  paymentAttempt: PaymentAttemptEntity;
  payuParams: PayUInitiationParams;
  payuPaymentUrl: string;
}

export class OrderService {
  /**
   * 1. Create Order, Order Items, and Payment Attempt Server-Side
   */
  public static async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const course = PricingEngine.getAuthoritativeCourse(input.courseId);
    const standardDisplayPrice = course.discountedPrice ?? course.price ?? course.originalPrice ?? 0;

    // Optional Coupon Validation
    let couponDiscountPaise = 0;
    let validatedCouponId: string | null = null;
    let validatedCouponCode: string | null = null;

    if (input.couponCode?.trim()) {
      const couponCheck = await CouponService.validateCoupon({
        code: input.couponCode.trim(),
        courseId: String(course.id),
        orderAmount: standardDisplayPrice,
        studentId: input.userId,
      });

      if (!couponCheck.valid) {
        throw new Error(`COUPON_INVALID: ${couponCheck.message}`);
      }

      couponDiscountPaise = PricingEngine.toPaise(couponCheck.discountAmount);
      validatedCouponId = couponCheck.couponId || null;
      validatedCouponCode = couponCheck.code;
    }

    // Authoritative Server-Side Price Calculation (Tax-Inclusive with 18% GST Breakdown)
    const price = PricingEngine.calculatePrice(String(course.id), couponDiscountPaise);

    // Generate Unique Order Number and Merchant Txn ID
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderNumber = `10Q-ORD-${timestamp}-${randomHex}`;
    const merchantTxnId = `10QTXN${timestamp}${randomHex}`;

    const db = await getCommerceDb();

    return await db.transaction(async (tx) => {
      // Insert Order Record
      const orderInsertRes = await tx.query(
        `INSERT INTO commerce.orders (
          order_number, user_id, course_id, original_amount, discount_amount,
          net_payable_amount, tax_inclusive_amount, tax_amount, currency,
          coupon_id, coupon_code,
          billing_full_name, billing_email, billing_phone,
          billing_address_line1, billing_address_line2, billing_city,
          billing_state_code, billing_postal_code, billing_country_code,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'INR',
          $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, 'IN',
          'PENDING_PAYMENT', NOW(), NOW()
        ) RETURNING *;`,
        [
          orderNumber,
          input.userId,
          price.courseId,
          price.originalAmount,
          price.discountAmount,
          price.netPayableAmount,
          price.netPayableAmount,
          price.taxAmount,
          validatedCouponId,
          validatedCouponCode,
          input.billingFullName.trim(),
          input.billingEmail.trim().toLowerCase(),
          input.billingPhone?.trim() || null,
          input.billingAddressLine1?.trim() || null,
          input.billingAddressLine2?.trim() || null,
          input.billingCity?.trim() || null,
          input.billingStateCode.trim().toUpperCase(),
          input.billingPostalCode?.trim() || null,
        ]
      );

      const orderRow = orderInsertRes.rows[0];

      // Insert Order Item Snapshot
      const orderItemInsertRes = await tx.query(
        `INSERT INTO commerce.order_items (
          order_id, product_type, product_id, product_title_snapshot,
          quantity, unit_price, tax_rate_snapshot, tax_amount,
          discount_amount, line_total, created_at
        ) VALUES (
          $1, 'COURSE', $2, $3,
          1, $4, $5, $6,
          $7, $8, NOW()
        ) RETURNING *;`,
        [
          orderRow.id,
          price.courseId,
          price.courseTitle,
          price.originalAmount,
          price.taxRatePercent,
          price.taxAmount,
          price.discountAmount,
          price.netPayableAmount,
        ]
      );

      // Reserve Coupon if applied
      if (validatedCouponId) {
        await tx.query(
          `INSERT INTO commerce.coupon_redemptions (
            coupon_id, student_id, order_id, discount_amount, redemption_status, redeemed_at
          ) VALUES ($1, $2, $3, $4, 'RESERVED', NOW())
          ON CONFLICT (order_id) DO UPDATE
          SET coupon_id = $1, discount_amount = $4, redemption_status = 'RESERVED', redeemed_at = NOW();`,
          [validatedCouponId, input.userId, orderRow.id, price.discountAmount]
        );
      }

      // Insert Payment Attempt Record
      const attemptInsertRes = await tx.query(
        `INSERT INTO commerce.payment_attempts (
          order_id, merchant_txn_id, attempted_amount, currency, gateway_name,
          status, initiated_at
        ) VALUES (
          $1, $2, $3, 'INR', 'PAYU', 'INITIATED', NOW()
        ) RETURNING *;`,
        [orderRow.id, merchantTxnId, price.netPayableAmount]
      );

      const attemptRow = attemptInsertRes.rows[0];

      // Log Payment Event (Audit Trail)
      await tx.query(
        `INSERT INTO commerce.payment_events (
          order_id, payment_attempt_id, event_type, severity, source, payload, created_at
        ) VALUES (
          $1, $2, 'PAYMENT_INITIATED', 'INFO', 'STUDENT_CHECKOUT', $3, NOW()
        );`,
        [
          orderRow.id,
          attemptRow.id,
          JSON.stringify({
            orderNumber,
            merchantTxnId,
            courseId: price.courseId,
            courseTitle: price.courseTitle,
            netPayable: price.netPayableAmount,
            couponCode: validatedCouponCode,
          }),
        ]
      );

      // Generate PayU Parameters and Payment Initiation Hash
      const formattedAmount = PricingEngine.toInrString(price.netPayableAmountPaise);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const hash = PayUService.generatePaymentHash({
        txnid: merchantTxnId,
        amount: formattedAmount,
        productinfo: price.courseTitle.substring(0, 100),
        firstname: input.billingFullName.split(' ')[0] || 'Student',
        email: input.billingEmail,
        udf1: attemptRow.id,
        udf2: orderRow.id,
      });

      const payuParams: PayUInitiationParams = {
        key: process.env.PAYU_MERCHANT_KEY || 'gtKFFx',
        txnid: merchantTxnId,
        amount: formattedAmount,
        productinfo: price.courseTitle.substring(0, 100),
        firstname: input.billingFullName.split(' ')[0] || 'Student',
        email: input.billingEmail,
        phone: input.billingPhone || '9999999999',
        surl: `${appUrl}/api/payment/payu-callback`,
        furl: `${appUrl}/api/payment/payu-callback`,
        hash: hash,
        udf1: attemptRow.id,
        udf2: orderRow.id,
      };

      // Update attempt with raw request params
      await tx.query(
        `UPDATE commerce.payment_attempts 
         SET raw_request = $1, status = 'SUBMITTED_TO_GATEWAY' 
         WHERE id = $2;`,
        [JSON.stringify(payuParams), attemptRow.id]
      );

      return {
        order: this.mapOrderRow(orderRow, [orderItemInsertRes.rows[0]]),
        paymentAttempt: {
          id: attemptRow.id,
          orderId: attemptRow.order_id,
          merchantTxnId: attemptRow.merchant_txn_id,
          attemptedAmount: parseFloat(attemptRow.attempted_amount),
          currency: 'INR',
          gatewayName: 'PAYU',
          status: 'SUBMITTED_TO_GATEWAY',
          initiatedAt: attemptRow.initiated_at,
        },
        payuParams,
        payuPaymentUrl: PayUService.getPaymentUrl(),
      };
    });
  }

  /**
   * 2. Authoritative Payment Settlement (Invokes Stored Procedure + Lifecycle Sync)
   */
  public static async settlePayment(params: {
    orderId: string;
    paymentAttemptId: string;
    gatewayPaymentId: string;
    verifiedAmount: number;
    gatewayTimestamp?: Date;
    rawPayload: any;
  }): Promise<{ success: boolean; statusCode: string; paymentId?: string; anomalyId?: string }> {
    const db = await getCommerceDb();

    const res = await db.query(
      `SELECT success, status_code, payment_id, anomaly_id 
       FROM commerce.settle_payment_authoritative($1, $2, $3, $4, $5, $6);`,
      [
        params.orderId,
        params.paymentAttemptId,
        params.gatewayPaymentId,
        params.verifiedAmount,
        params.gatewayTimestamp || new Date(),
        JSON.stringify(params.rawPayload),
      ]
    );

    const row = res.rows[0];
    const isSuccess = Boolean(row.success);

    if (isSuccess) {
      // 1. Confirm Coupon Redemption if any was reserved
      try {
        await CouponService.confirmRedemption(params.orderId);
      } catch (err) {
        console.error('[OrderService.settlePayment confirmRedemption error]', err);
      }

      // 2. Log Settlement Success Event
      await db.query(
        `INSERT INTO commerce.payment_events (
          order_id, payment_attempt_id, payment_id, event_type, severity, source, payload, created_at
        ) VALUES ($1, $2, $3, 'SETTLEMENT_SUCCESS', 'INFO', 'PAYU_GATEWAY', $4, NOW());`,
        [
          params.orderId,
          params.paymentAttemptId,
          row.payment_id,
          JSON.stringify({
            gatewayPaymentId: params.gatewayPaymentId,
            verifiedAmount: params.verifiedAmount,
            statusCode: row.status_code,
          }),
        ]
      );

      // 3. Automatically generate immutable invoice upon confirmed payment
      try {
        await InvoiceService.generateInvoice(params.orderId);
      } catch (err) {
        console.error('[OrderService.settlePayment invoice generation error]', err);
      }
    } else {
      // Release Coupon Reservation on settlement rejection
      try {
        await CouponService.releaseReservation(params.orderId);
      } catch (err) {
        console.error('[OrderService.settlePayment releaseReservation error]', err);
      }

      // Log Settlement Rejection Event
      await db.query(
        `INSERT INTO commerce.payment_events (
          order_id, payment_attempt_id, event_type, severity, source, payload, created_at
        ) VALUES ($1, $2, 'SETTLEMENT_REJECTED', 'ERROR', 'PAYU_GATEWAY', $3, NOW());`,
        [
          params.orderId,
          params.paymentAttemptId,
          JSON.stringify({
            statusCode: row.status_code,
            anomalyId: row.anomaly_id,
            raw: params.rawPayload,
          }),
        ]
      );
    }

    return {
      success: isSuccess,
      statusCode: row.status_code,
      paymentId: row.payment_id || undefined,
      anomalyId: row.anomaly_id || undefined,
    };
  }

  /**
   * Retrieve Order by ID (Includes Items, Payments, Refunds)
   */
  public static async getOrderById(orderId: string): Promise<OrderEntity | null> {
    const db = await getCommerceDb();
    const res = await db.query('SELECT * FROM commerce.orders WHERE id = $1 LIMIT 1;', [orderId]);
    if (res.rows.length === 0) return null;

    const orderRow = res.rows[0];

    // Fetch order items
    const itemsRes = await db.query(
      'SELECT * FROM commerce.order_items WHERE order_id = $1 ORDER BY created_at ASC;',
      [orderId]
    );

    // Fetch payments
    const paymentsRes = await db.query(
      'SELECT * FROM commerce.payments WHERE order_id = $1 ORDER BY settled_at DESC;',
      [orderId]
    );

    // Fetch refunds
    const refundsRes = await db.query(
      'SELECT * FROM commerce.refunds WHERE order_id = $1 ORDER BY initiated_at DESC;',
      [orderId]
    );

    return this.mapOrderRow(orderRow, itemsRes.rows, paymentsRes.rows, refundsRes.rows);
  }

  /**
   * Retrieve Order by Order Number
   */
  public static async getOrderByNumber(orderNumber: string): Promise<OrderEntity | null> {
    const db = await getCommerceDb();
    const res = await db.query('SELECT * FROM commerce.orders WHERE order_number = $1 LIMIT 1;', [orderNumber]);
    if (res.rows.length === 0) return null;
    return this.getOrderById(res.rows[0].id);
  }

  /**
   * Retrieve All Orders for a Student (Anti-IDOR: strictly scoped to studentId)
   */
  public static async getStudentOrders(userId: number): Promise<OrderEntity[]> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM commerce.orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC;`,
      [userId]
    );

    if (res.rows.length === 0) return [];

    const orderIds = res.rows.map((r: any) => r.id);

    // Fetch all items for these orders
    const itemsRes = await db.query(
      `SELECT * FROM commerce.order_items WHERE order_id = ANY($1::uuid[]) ORDER BY created_at ASC;`,
      [orderIds]
    );
    const itemMap = new Map<string, any[]>();
    for (const item of itemsRes.rows) {
      const list = itemMap.get(item.order_id) || [];
      list.push(item);
      itemMap.set(item.order_id, list);
    }

    return res.rows.map((r: any) => this.mapOrderRow(r, itemMap.get(r.id) || []));
  }

  /**
   * Retrieve Payment Attempt by ID
   */
  public static async getAttemptById(attemptId: string): Promise<PaymentAttemptEntity | null> {
    const db = await getCommerceDb();
    const res = await db.query('SELECT * FROM commerce.payment_attempts WHERE id = $1 LIMIT 1;', [attemptId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      orderId: r.order_id,
      merchantTxnId: r.merchant_txn_id,
      attemptedAmount: parseFloat(r.attempted_amount),
      currency: 'INR',
      gatewayName: 'PAYU',
      gatewayPaymentId: r.gateway_payment_id,
      status: r.status,
      initiatedAt: r.initiated_at,
      completedAt: r.completed_at,
      rawRequest: r.raw_request,
      rawResponse: r.raw_response,
    };
  }

  /**
   * Update Payment Attempt Status
   */
  public static async updateAttemptStatus(attemptId: string, status: string, rawResponse?: any): Promise<void> {
    const db = await getCommerceDb();
    await db.query(
      `UPDATE commerce.payment_attempts 
       SET status = $1, raw_response = $2, completed_at = NOW() 
       WHERE id = $3;`,
      [status, rawResponse ? JSON.stringify(rawResponse) : null, attemptId]
    );
  }

  private static mapOrderRow(
    r: any,
    itemRows: any[] = [],
    paymentRows: any[] = [],
    refundRows: any[] = []
  ): OrderEntity {
    return {
      id: r.id,
      orderNumber: r.order_number,
      userId: Number(r.user_id),
      courseId: r.course_id,
      currency: r.currency || 'INR',
      originalAmount: parseFloat(r.original_amount),
      discountAmount: parseFloat(r.discount_amount),
      netPayableAmount: parseFloat(r.net_payable_amount),
      taxInclusiveAmount: parseFloat(r.tax_inclusive_amount || r.net_payable_amount),
      taxAmount: parseFloat(r.tax_amount || '0.00'),
      couponId: r.coupon_id || null,
      couponCode: r.coupon_code || null,
      billingFullName: r.billing_full_name,
      billingEmail: r.billing_email,
      billingPhone: r.billing_phone,
      billingAddressLine1: r.billing_address_line1,
      billingAddressLine2: r.billing_address_line2,
      billingCity: r.billing_city,
      billingStateCode: r.billing_state_code,
      billingPostalCode: r.billing_postal_code,
      billingCountryCode: r.billing_country_code || 'IN',
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
      items: itemRows.map((i: any) => ({
        id: i.id,
        orderId: i.order_id,
        productType: 'COURSE',
        productId: i.product_id,
        productTitleSnapshot: i.product_title_snapshot,
        quantity: parseInt(i.quantity, 10),
        unitPrice: parseFloat(i.unit_price),
        taxRateSnapshot: parseFloat(i.tax_rate_snapshot),
        taxAmount: parseFloat(i.tax_amount),
        discountAmount: parseFloat(i.discount_amount),
        lineTotal: parseFloat(i.line_total),
        createdAt: i.created_at ? new Date(i.created_at).toISOString() : '',
      })),
      payments: paymentRows.map((p: any) => ({
        id: p.id,
        orderId: p.order_id,
        paymentAttemptId: p.payment_attempt_id,
        gatewayName: p.gateway_name,
        gatewayPaymentId: p.gateway_payment_id,
        amount: parseFloat(p.amount),
        currency: p.currency || 'INR',
        settlementStatus: p.settlement_status,
        settledAt: p.settled_at ? new Date(p.settled_at).toISOString() : '',
        metadata: p.metadata,
      })),
      refunds: refundRows.map((ref: any) => ({
        id: ref.id,
        orderId: ref.order_id,
        paymentId: ref.payment_id,
        refundReference: ref.refund_reference,
        amount: parseFloat(ref.amount),
        currency: ref.currency || 'INR',
        reason: ref.reason,
        status: ref.status,
        gatewayRefundId: ref.gateway_refund_id,
        initiatedBy: Number(ref.initiated_by),
        initiatedAt: ref.initiated_at ? new Date(ref.initiated_at).toISOString() : '',
        processedAt: ref.processed_at ? new Date(ref.processed_at).toISOString() : null,
        failureReason: ref.failure_reason,
        createdAt: ref.created_at ? new Date(ref.created_at).toISOString() : '',
      })),
    };
  }
}
