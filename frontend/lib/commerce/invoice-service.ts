// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 12: INVOICE SERVICE
// Authoritative Invoice Issuance, Numbering, Concurrency, and Anti-IDOR Queries.
// Database Engine: PostgreSQL 16 (PGlite / External Pool via getCommerceDb)
// ==============================================================================

import { getCommerceDb } from './db';
import { InvoiceEntity, InvoiceStatus, OrderItemEntity, RefundEntity } from './types';

export class InvoiceService {
  /**
   * Helper: Map a database row to an InvoiceEntity
   */
  private static mapRow(row: any): InvoiceEntity {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      orderId: row.order_id,
      paymentId: row.payment_id,
      userId: Number(row.user_id),
      billingFullName: row.billing_full_name,
      billingEmail: row.billing_email,
      billingPhone: row.billing_phone,
      billingAddressLine1: row.billing_address_line1,
      billingAddressLine2: row.billing_address_line2,
      billingCity: row.billing_city,
      billingStateCode: row.billing_state_code,
      billingPostalCode: row.billing_postal_code,
      billingCountryCode: row.billing_country_code || 'IN',
      currency: row.currency || 'INR',
      originalAmount: Number(row.original_amount),
      discountAmount: Number(row.discount_amount),
      couponCode: row.coupon_code,
      finalAmount: Number(row.final_amount),
      gatewayName: row.gateway_name,
      gatewayPaymentId: row.gateway_payment_id,
      merchantTxnId: row.merchant_txn_id,
      status: row.status as InvoiceStatus,
      issuedAt: row.issued_at ? new Date(row.issued_at).toISOString() : new Date().toISOString(),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * 1. Automatically generate an invoice after confirmed successful payment
   * Strict Safety Gates:
   * - Never generate for pending, failed, or cancelled orders.
   * - Idempotent: Repeated callbacks return the existing invoice without duplicate generation.
   * - Atomic sequence allocation for unique invoice numbering.
   */
  public static async generateInvoice(orderId: string): Promise<InvoiceEntity> {
    const db = await getCommerceDb();

    // 1. Check if invoice already exists for this order (Idempotency)
    const existing = await db.query(
      `SELECT * FROM commerce.invoices WHERE order_id = $1 LIMIT 1;`,
      [orderId]
    );
    if (existing.rows.length > 0) {
      const invoice = this.mapRow(existing.rows[0]);
      invoice.items = await this.getOrderItems(db, orderId);
      return invoice;
    }

    // 2. Fetch the authoritative order record
    const orderRes = await db.query(
      `SELECT * FROM commerce.orders WHERE id = $1 LIMIT 1;`,
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      throw new Error(`ORDER_NOT_FOUND: Order "${orderId}" does not exist.`);
    }

    const order = orderRes.rows[0];
    const allowedStatuses = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];
    if (!allowedStatuses.includes(order.status)) {
      throw new Error(
        `ORDER_NOT_PAID: Cannot generate a paid invoice for order "${orderId}" with status "${order.status}". Payment must be confirmed first.`
      );
    }

    // 3. Fetch confirmed settled payment record
    const payRes = await db.query(
      `SELECT * FROM commerce.payments 
       WHERE order_id = $1 AND settlement_status = 'SETTLED'
       ORDER BY settled_at DESC LIMIT 1;`,
      [orderId]
    );
    if (payRes.rows.length === 0) {
      throw new Error(
        `PAYMENT_NOT_SETTLED: Order "${orderId}" has no confirmed settled payment record.`
      );
    }
    const payment = payRes.rows[0];

    // 4. Fetch payment attempt to retrieve merchant_txn_id if available
    let merchantTxnId = `TXN-${order.id.substring(0, 8)}`;
    if (payment.payment_attempt_id) {
      const attemptRes = await db.query(
        `SELECT merchant_txn_id FROM commerce.payment_attempts WHERE id = $1 LIMIT 1;`,
        [payment.payment_attempt_id]
      );
      if (attemptRes.rows.length > 0 && attemptRes.rows[0].merchant_txn_id) {
        merchantTxnId = attemptRes.rows[0].merchant_txn_id;
      }
    }

    // 5. Generate concurrency-safe sequential invoice number (10Q-INV-YYYY-XXXXX)
    const seqRes = await db.query(`SELECT nextval('commerce.invoice_number_seq') AS seq;`);
    const seqVal = seqRes.rows[0].seq;
    const year = new Date().getFullYear();
    const invoiceNumber = `10Q-INV-${year}-${String(seqVal).padStart(5, '0')}`;

    // 6. Determine invoice status
    let initialStatus: InvoiceStatus = 'ISSUED';
    if (order.status === 'PARTIALLY_REFUNDED') initialStatus = 'PARTIALLY_REFUNDED';
    else if (order.status === 'REFUNDED') initialStatus = 'REFUNDED';

    const issuedAt = payment.settled_at || order.completed_at || new Date();

    // 7. Insert invoice record with ON CONFLICT DO NOTHING (safe against parallel concurrent executions)
    const insertRes = await db.query(
      `INSERT INTO commerce.invoices (
        invoice_number,
        order_id,
        payment_id,
        user_id,
        billing_full_name,
        billing_email,
        billing_phone,
        billing_address_line1,
        billing_address_line2,
        billing_city,
        billing_state_code,
        billing_postal_code,
        billing_country_code,
        currency,
        original_amount,
        discount_amount,
        coupon_code,
        final_amount,
        gateway_name,
        gateway_payment_id,
        merchant_txn_id,
        status,
        issued_at,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
      )
      ON CONFLICT (order_id) DO NOTHING
      RETURNING *;`,
      [
        invoiceNumber,
        order.id,
        payment.id,
        order.user_id,
        order.billing_full_name,
        order.billing_email,
        order.billing_phone,
        order.billing_address_line1,
        order.billing_address_line2,
        order.billing_city,
        order.billing_state_code,
        order.billing_postal_code,
        order.billing_country_code || 'IN',
        order.currency || 'INR',
        order.original_amount,
        order.discount_amount || 0.0,
        order.coupon_code,
        payment.amount || order.net_payable_amount,
        payment.gateway_name || 'PAYU',
        payment.gateway_payment_id,
        merchantTxnId,
        initialStatus,
        issuedAt,
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          paymentSettledAt: payment.settled_at,
        }),
      ]
    );

    let row = insertRes.rows[0];
    if (!row) {
      // Parallel execution won the race, fetch the winning row
      const checkWinning = await db.query(
        `SELECT * FROM commerce.invoices WHERE order_id = $1 LIMIT 1;`,
        [orderId]
      );
      row = checkWinning.rows[0];
    }

    const entity = this.mapRow(row);
    entity.items = await this.getOrderItems(db, orderId);
    return entity;
  }

  /**
   * Helper: Retrieve order line items
   */
  private static async getOrderItems(db: any, orderId: string): Promise<OrderItemEntity[]> {
    const res = await db.query(
      `SELECT * FROM commerce.order_items WHERE order_id = $1 ORDER BY created_at ASC;`,
      [orderId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      orderId: r.order_id,
      productType: r.product_type,
      productId: r.product_id,
      productTitleSnapshot: r.product_title_snapshot,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unit_price),
      taxRateSnapshot: Number(r.tax_rate_snapshot || 0),
      taxAmount: Number(r.tax_amount || 0),
      discountAmount: Number(r.discount_amount || 0),
      lineTotal: Number(r.line_total),
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * 2. Get invoice by ID or Invoice Number with Anti-IDOR Authorization Check
   */
  public static async getInvoiceById(
    identifier: string,
    requestingUserId?: number,
    isAdmin: boolean = false
  ): Promise<InvoiceEntity | null> {
    const db = await getCommerceDb();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const query = isUuid
      ? `SELECT * FROM commerce.invoices WHERE id = $1 LIMIT 1;`
      : `SELECT * FROM commerce.invoices WHERE invoice_number = $1 LIMIT 1;`;

    const res = await db.query(query, [identifier]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    // Anti-IDOR Authorization Gate
    if (!isAdmin && requestingUserId !== undefined && Number(row.user_id) !== Number(requestingUserId)) {
      throw new Error(`FORBIDDEN: You are not authorized to view or download this invoice.`);
    }

    const entity = this.mapRow(row);
    entity.items = await this.getOrderItems(db, entity.orderId);

    // Fetch refunds if any
    const refundsRes = await db.query(
      `SELECT * FROM commerce.refunds WHERE order_id = $1 ORDER BY initiated_at ASC;`,
      [entity.orderId]
    );
    entity.refunds = refundsRes.rows.map((rf: any) => ({
      id: rf.id,
      orderId: rf.order_id,
      paymentId: rf.payment_id,
      refundReference: rf.refund_reference || `REF-${rf.id.substring(0, 8)}`,
      amount: Number(rf.amount || rf.refund_amount || 0),
      currency: rf.currency || 'INR',
      reason: rf.reason,
      status: rf.status,
      gatewayRefundId: rf.gateway_refund_id,
      initiatedBy: Number(rf.initiated_by || 0),
      initiatedAt: new Date(rf.initiated_at).toISOString(),
      processedAt: rf.processed_at ? new Date(rf.processed_at).toISOString() : undefined,
      createdAt: new Date(rf.initiated_at || Date.now()).toISOString(),
    }));

    return entity;
  }

  /**
   * 3. Get invoice by Order ID with Anti-IDOR Authorization Check
   */
  public static async getInvoiceByOrderId(
    orderId: string,
    requestingUserId?: number,
    isAdmin: boolean = false
  ): Promise<InvoiceEntity | null> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM commerce.invoices WHERE order_id = $1 LIMIT 1;`,
      [orderId]
    );
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    if (!isAdmin && requestingUserId !== undefined && Number(row.user_id) !== Number(requestingUserId)) {
      throw new Error(`FORBIDDEN: You are not authorized to access this invoice.`);
    }

    const entity = this.mapRow(row);
    entity.items = await this.getOrderItems(db, orderId);
    return entity;
  }

  /**
   * 4. List invoices for a student
   */
  public static async listStudentInvoices(userId: number): Promise<InvoiceEntity[]> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM commerce.invoices WHERE user_id = $1 ORDER BY issued_at DESC;`,
      [userId]
    );

    const invoices: InvoiceEntity[] = [];
    for (const row of res.rows) {
      const inv = this.mapRow(row);
      inv.items = await this.getOrderItems(db, inv.orderId);
      invoices.push(inv);
    }
    return invoices;
  }

  /**
   * 5. Admin invoice management register with search, filter, and pagination
   */
  public static async listAdminInvoices(params: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: InvoiceEntity[]; total: number; page: number; totalPages: number }> {
    const db = await getCommerceDb();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }

    if (params.search) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        `(invoice_number ILIKE $${idx} OR billing_full_name ILIKE $${idx} OR billing_email ILIKE $${idx} OR gateway_payment_id ILIKE $${idx} OR merchant_txn_id ILIKE $${idx} OR order_id::text ILIKE $${idx})`
      );
      values.push(term);
      idx++;
    }

    if (params.startDate) {
      conditions.push(`issued_at >= $${idx++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`issued_at <= $${idx++}`);
      values.push(params.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM commerce.invoices WHERE ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const dataRes = await db.query(
      `SELECT * FROM commerce.invoices WHERE ${whereClause} ORDER BY issued_at DESC LIMIT ${limit} OFFSET ${offset};`,
      values
    );

    const invoices: InvoiceEntity[] = [];
    for (const row of dataRes.rows) {
      const inv = this.mapRow(row);
      inv.items = await this.getOrderItems(db, inv.orderId);
      invoices.push(inv);
    }

    return {
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 6. Link refund to an invoice
   */
  public static async recordRefundOnInvoice(
    orderId: string,
    refundId: string,
    refundAmount: number,
    isFullRefund: boolean
  ): Promise<void> {
    const db = await getCommerceDb();
    const targetStatus: InvoiceStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await db.query(
      `UPDATE commerce.invoices
       SET status = $1,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{refund}',
             jsonb_build_object(
               'refundId', $2::text,
               'refundAmount', $3::numeric,
               'recordedAt', NOW()
             )
           ),
           updated_at = NOW()
       WHERE order_id = $4;`,
      [targetStatus, refundId, refundAmount, orderId]
    );
  }

  /**
   * 7. Safe idempotent backfill for verified historical paid orders
   */
  public static async backfillHistoricalInvoices(): Promise<{ backfilledCount: number; existingCount: number }> {
    const db = await getCommerceDb();
    const existingCountRes = await db.query(`SELECT COUNT(*) as count FROM commerce.invoices;`);
    const initialCount = parseInt(existingCountRes.rows[0].count, 10);

    const candidates = await db.query(
      `SELECT o.id 
       FROM commerce.orders o
       INNER JOIN commerce.payments p ON p.order_id = o.id AND p.settlement_status = 'SETTLED'
       WHERE o.status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
         AND NOT EXISTS (SELECT 1 FROM commerce.invoices i WHERE i.order_id = o.id)
       ORDER BY o.created_at ASC;`
    );

    let backfilled = 0;
    for (const row of candidates.rows) {
      try {
        await this.generateInvoice(row.id);
        backfilled++;
      } catch (e) {
        console.error(`[InvoiceService.backfillHistoricalInvoices] Failed for order ${row.id}:`, e);
      }
    }

    const finalCountRes = await db.query(`SELECT COUNT(*) as count FROM commerce.invoices;`);
    const finalCount = parseInt(finalCountRes.rows[0].count, 10);

    return {
      backfilledCount: backfilled,
      existingCount: finalCount,
    };
  }
}
