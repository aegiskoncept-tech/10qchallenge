// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 11: REFUND MANAGEMENT SERVICE
// Engine: PostgreSQL 16 (commerce.refunds, commerce.orders, commerce.payments)
// Supports: Full & Partial Refunds, Remaining Amount Validation,
//           Audit Trail & Gateway Reference Tracking.
// ==============================================================================

import * as crypto from 'node:crypto';
import { getCommerceDb } from './db';
import { RefundEntity, RefundStatus } from './types';

export interface InitiateRefundInput {
  orderId: string;
  amount?: number; // If omitted, defaults to full remaining refundable amount
  reason: string;
  adminUserId: number; // Authentic Admin ID
}

export interface InitiateRefundResult {
  success: boolean;
  refund?: RefundEntity;
  error?: string;
  remainingRefundableAmount?: number;
}

export class RefundService {
  /**
   * Authoritative server-side refund initiation
   */
  public static async initiateRefund(input: InitiateRefundInput): Promise<InitiateRefundResult> {
    const reason = (input.reason || '').trim();
    if (!reason || reason.length < 3) {
      return { success: false, error: 'A specific refund reason is required (minimum 3 characters).' };
    }

    const db = await getCommerceDb();

    return await db.transaction(async (tx) => {
      // 1. Lock and retrieve Order
      const orderRes = await tx.query(
        `SELECT id, order_number, user_id, net_payable_amount, status 
         FROM commerce.orders 
         WHERE id = $1 
         FOR UPDATE;`,
        [input.orderId]
      );

      if (orderRes.rows.length === 0) {
        return { success: false, error: 'Order not found.' };
      }

      const order = orderRes.rows[0];

      // 2. Validate Order is Paid or Partially Refunded
      if (!['PAID', 'PARTIALLY_REFUNDED'].includes(order.status)) {
        return {
          success: false,
          error: `Cannot refund order with status "${order.status}". Only PAID or PARTIALLY_REFUNDED orders are eligible.`,
        };
      }

      // 3. Find settled payment for this order
      const paymentRes = await tx.query(
        `SELECT id, gateway_payment_id, amount, settlement_status 
         FROM commerce.payments 
         WHERE order_id = $1 AND settlement_status = 'SETTLED' 
         LIMIT 1;`,
        [input.orderId]
      );

      if (paymentRes.rows.length === 0) {
        return { success: false, error: 'No settled payment found for this order to refund.' };
      }

      const payment = paymentRes.rows[0];
      const orderCapturedAmount = parseFloat(order.net_payable_amount);

      // 4. Calculate Total Already Refunded
      const priorRefundsRes = await tx.query(
        `SELECT COALESCE(SUM(amount), 0) as total_refunded 
         FROM commerce.refunds 
         WHERE order_id = $1 AND status IN ('REQUESTED', 'PROCESSING', 'CONFIRMED');`,
        [input.orderId]
      );

      const alreadyRefunded = parseFloat(priorRefundsRes.rows[0]?.total_refunded || '0');
      const remainingRefundable = Math.max(0, Math.round((orderCapturedAmount - alreadyRefunded) * 100) / 100);

      if (remainingRefundable <= 0) {
        return {
          success: false,
          error: 'This order has already been fully refunded.',
          remainingRefundableAmount: 0,
        };
      }

      // Determine requested refund amount
      const requestedAmount = input.amount !== undefined ? Math.round(input.amount * 100) / 100 : remainingRefundable;

      if (requestedAmount <= 0) {
        return { success: false, error: 'Refund amount must be greater than zero.' };
      }

      if (requestedAmount > remainingRefundable) {
        return {
          success: false,
          error: `Requested refund amount ₹${requestedAmount} exceeds maximum remaining refundable amount ₹${remainingRefundable}.`,
          remainingRefundableAmount: remainingRefundable,
        };
      }

      // 5. Generate Refund Reference & Simulated Gateway Refund ID
      const timestamp = Date.now();
      const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const refundRef = `REF-${timestamp}-${randHex}`;
      const gatewayRefundId = `PAYU_REF_${timestamp}_${randHex}`;

      // 6. Insert Refund Record
      const insertRes = await tx.query(
        `INSERT INTO commerce.refunds (
          order_id, payment_id, refund_reference, amount, currency,
          reason, status, gateway_refund_id, initiated_by, initiated_at, processed_at
        ) VALUES (
          $1, $2, $3, $4, 'INR',
          $5, 'CONFIRMED', $6, $7, NOW(), NOW()
        ) RETURNING *;`,
        [
          order.id,
          payment.id,
          refundRef,
          requestedAmount,
          reason,
          gatewayRefundId,
          input.adminUserId,
        ]
      );

      const refundRow = insertRes.rows[0];

      // 7. Update Order Status (PARTIALLY_REFUNDED vs REFUNDED)
      const newTotalRefunded = alreadyRefunded + requestedAmount;
      const isFullRefund = newTotalRefunded >= orderCapturedAmount;
      const newOrderStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.query(
        `UPDATE commerce.orders 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2;`,
        [newOrderStatus, order.id]
      );

      // 8. Log Payment Event
      await tx.query(
        `INSERT INTO commerce.payment_events (
          order_id, payment_id, event_type, severity, source, payload, created_at
        ) VALUES ($1, $2, 'REFUND_PROCESSED', 'INFO', 'ADMIN_PORTAL', $3, NOW());`,
        [
          order.id,
          payment.id,
          JSON.stringify({
            refundReference: refundRef,
            amount: requestedAmount,
            isFullRefund,
            reason,
            adminUserId: input.adminUserId,
            newOrderStatus,
          }),
        ]
      );

      // 9. Sync Invoice Status and Record Refund Reference
      try {
        const targetInvoiceStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await tx.query(
          `UPDATE commerce.invoices 
           SET status = $1, 
               metadata = jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{refund}',
                 jsonb_build_object(
                   'refundReference', $2::text,
                   'refundAmount', $3::numeric,
                   'isFullRefund', $4::boolean,
                   'processedAt', NOW()
                 )
               ),
               updated_at = NOW()
           WHERE order_id = $5;`,
          [targetInvoiceStatus, refundRef, requestedAmount, isFullRefund, order.id]
        );
      } catch (invErr) {
        console.error('[RefundService] Invoice status sync error (non-fatal):', invErr);
      }

      const refundEntity = this.mapRefundRow(refundRow);

      return {
        success: true,
        refund: refundEntity,
        remainingRefundableAmount: Math.max(0, Math.round((orderCapturedAmount - newTotalRefunded) * 100) / 100),
      };
    });
  }

  /**
   * Admin: List all refunds with filters
   */
  public static async listRefunds(filters?: {
    search?: string;
    status?: string;
  }): Promise<RefundEntity[]> {
    const db = await getCommerceDb();
    let sql = `
      SELECT r.*, o.order_number, o.billing_full_name, o.billing_email 
      FROM commerce.refunds r
      JOIN commerce.orders o ON o.id = r.order_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      params.push(filters.status.toUpperCase());
      sql += ` AND r.status = $${params.length}`;
    }

    if (filters?.search) {
      params.push(`%${filters.search.toUpperCase()}%`);
      sql += ` AND (UPPER(r.refund_reference) LIKE $${params.length} OR UPPER(o.order_number) LIKE $${params.length} OR UPPER(o.billing_full_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY r.initiated_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapRefundRow);
  }

  /**
   * Retrieve single refund by ID
   */
  public static async getRefundById(refundId: string): Promise<RefundEntity | null> {
    const db = await getCommerceDb();
    const res = await db.query(`SELECT * FROM commerce.refunds WHERE id = $1 LIMIT 1;`, [refundId]);
    if (res.rows.length === 0) return null;
    return this.mapRefundRow(res.rows[0]);
  }

  private static mapRefundRow(r: any): RefundEntity {
    const isSimulated = Boolean(
      (r.gateway_refund_id && r.gateway_refund_id.startsWith('PAYU_REF_')) ||
      r.is_simulated ||
      process.env.PAYU_ENV !== 'production'
    );
    const isGatewayConfirmed = !isSimulated && r.status === 'CONFIRMED';

    return {
      id: r.id,
      orderId: r.order_id,
      paymentId: r.payment_id || null,
      refundReference: r.refund_reference,
      amount: parseFloat(r.amount),
      currency: r.currency || 'INR',
      reason: r.reason,
      status: r.status as RefundStatus,
      gatewayRefundId: r.gateway_refund_id || null,
      initiatedBy: Number(r.initiated_by),
      initiatedAt: r.initiated_at ? new Date(r.initiated_at).toISOString() : '',
      processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : null,
      failureReason: r.failure_reason || null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
      isSimulated,
      isGatewayConfirmed,
      orderNumber: r.order_number,
      billingFullName: r.billing_full_name,
      billingEmail: r.billing_email,
    };
  }
}
