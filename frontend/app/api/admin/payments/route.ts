import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { getCommerceDb } from '@/lib/commerce/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'LIST_ORDERS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const statusParam = searchParams.get('status');

    const db = await getCommerceDb();

    let sql = `
      SELECT 
        p.id,
        p.order_id,
        p.payment_attempt_id,
        p.gateway_name,
        p.gateway_payment_id,
        p.amount,
        p.currency,
        p.settlement_status,
        p.settled_at,
        p.metadata,
        o.order_number,
        o.user_id,
        o.course_id,
        o.billing_full_name,
        o.billing_email,
        o.status as order_status,
        pa.merchant_txn_id,
        pa.status as attempt_status
      FROM commerce.payments p
      JOIN commerce.orders o ON o.id = p.order_id
      LEFT JOIN commerce.payment_attempts pa ON pa.id = p.payment_attempt_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (statusParam && statusParam !== 'ALL') {
      params.push(statusParam.toUpperCase());
      sql += ` AND p.settlement_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (
        LOWER(p.gateway_payment_id) LIKE $${params.length} OR 
        LOWER(o.order_number) LIKE $${params.length} OR 
        LOWER(o.billing_full_name) LIKE $${params.length} OR 
        LOWER(o.billing_email) LIKE $${params.length} OR
        LOWER(COALESCE(pa.merchant_txn_id, '')) LIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY p.settled_at DESC;`;

    const res = await db.query(sql, params);

    const payments = res.rows.map((r: any) => ({
      id: r.id,
      orderId: r.order_id,
      orderNumber: r.order_number,
      userId: Number(r.user_id),
      courseId: r.course_id,
      billingFullName: r.billing_full_name,
      billingEmail: r.billing_email,
      merchantTxnId: r.merchant_txn_id || null,
      gatewayName: r.gateway_name,
      gatewayPaymentId: r.gateway_payment_id,
      amount: parseFloat(r.amount),
      currency: r.currency || 'INR',
      settlementStatus: r.settlement_status,
      settledAt: r.settled_at ? new Date(r.settled_at).toISOString() : '',
      orderStatus: r.order_status,
      attemptStatus: r.attempt_status,
      metadata: r.metadata,
    }));

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/payments Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve payments.' },
      { status: 500 }
    );
  }
}
