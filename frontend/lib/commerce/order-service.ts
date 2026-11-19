// ==============================================================================
// 10Q CHALLENGE LMS — PHASE 4.2 SERVER-SIDE ORDER & SETTLEMENT SERVICE
// Framework: Next.js 16 + TypeScript
// Integration: PostgreSQL 16 (Commerce) + SQLite (Identity/Auth)
// ==============================================================================

import * as crypto from 'node:crypto';
import { getCommerceDb } from './db';
import { PricingEngine } from './pricing';
import { PayUService } from './payu';
import { OrderEntity, PaymentAttemptEntity, PayUInitiationParams } from './types';

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
   * 1. Create Order and Payment Attempt Server-Side
   */
  public static async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1. Authoritative Server-Side Price Calculation (Tax-Inclusive)
    const price = PricingEngine.calculatePrice(input.courseId);

    // 2. Generate Unique Order Number and Merchant Txn ID
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderNumber = `10Q-ORD-${timestamp}-${randomHex}`;
    const merchantTxnId = `10QTXN${timestamp}${randomHex}`;

    const db = await getCommerceDb();

    return await db.transaction(async (tx) => {
      // 3. Insert Order Record in PostgreSQL 16
      const orderInsertRes = await tx.query(
        `INSERT INTO commerce.orders (
          order_number, user_id, course_id, original_amount, discount_amount,
          net_payable_amount, billing_full_name, billing_email, billing_phone,
          billing_address_line1, billing_address_line2, billing_city,
          billing_state_code, billing_postal_code, billing_country_code,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'IN',
          'PENDING_PAYMENT', NOW(), NOW()
        ) RETURNING *;`,
        [
          orderNumber,
          input.userId,
          price.courseId,
          price.originalAmount,
          price.discountAmount,
          price.netPayableAmount,
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

      // 4. Insert Payment Attempt Record
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

      // 5. Generate PayU Parameters and Payment Initiation Hash
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
        order: {
          id: orderRow.id,
          orderNumber: orderRow.order_number,
          userId: Number(orderRow.user_id),
          courseId: orderRow.course_id,
          originalAmount: parseFloat(orderRow.original_amount),
          discountAmount: parseFloat(orderRow.discount_amount),
          netPayableAmount: parseFloat(orderRow.net_payable_amount),
          billingFullName: orderRow.billing_full_name,
          billingEmail: orderRow.billing_email,
          billingPhone: orderRow.billing_phone,
          billingStateCode: orderRow.billing_state_code,
          billingCountryCode: orderRow.billing_country_code,
          status: orderRow.status,
          createdAt: orderRow.created_at,
          updatedAt: orderRow.updated_at,
        },
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
   * 2. Authoritative Payment Settlement (Invokes Stored Procedure)
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
    return {
      success: Boolean(row.success),
      statusCode: row.status_code,
      paymentId: row.payment_id || undefined,
      anomalyId: row.anomaly_id || undefined,
    };
  }

  /**
   * Retrieve Order by ID
   */
  public static async getOrderById(orderId: string): Promise<OrderEntity | null> {
    const db = await getCommerceDb();
    const res = await db.query('SELECT * FROM commerce.orders WHERE id = $1 LIMIT 1;', [orderId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      orderNumber: r.order_number,
      userId: Number(r.user_id),
      courseId: r.course_id,
      originalAmount: parseFloat(r.original_amount),
      discountAmount: parseFloat(r.discount_amount),
      netPayableAmount: parseFloat(r.net_payable_amount),
      billingFullName: r.billing_full_name,
      billingEmail: r.billing_email,
      billingPhone: r.billing_phone,
      billingStateCode: r.billing_state_code,
      billingCountryCode: r.billing_country_code,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
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
}
