import { NextRequest, NextResponse } from 'next/server';
import { getCommerceDb } from '@/lib/commerce/db';
import { readCoursesFromDb } from '@/lib/db/courses';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'LIST_ORDERS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const statusParam = searchParams.get('status');

    const db = await getCommerceDb();
    const courses = readCoursesFromDb();
    const courseMap = new Map<string, string>();
    courses.forEach((c) => courseMap.set(String(c.id), c.title));

    // Query orders joined with payment attempts, payments and anomalies
    const sql = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.course_id,
        o.original_amount,
        o.discount_amount,
        o.net_payable_amount,
        o.billing_full_name,
        o.billing_email,
        o.billing_phone,
        o.billing_state_code,
        o.status AS order_status,
        o.created_at,
        pa.id AS attempt_id,
        pa.merchant_txn_id,
        pa.gateway_name,
        pa.status AS attempt_status,
        pa.attempted_amount,
        p.id AS payment_id,
        p.gateway_payment_id,
        p.settlement_status,
        p.settled_at
      FROM commerce.orders o
      LEFT JOIN commerce.payment_attempts pa ON pa.order_id = o.id
      LEFT JOIN commerce.payments p ON p.payment_attempt_id = pa.id
      ORDER BY o.created_at DESC;
    `;

    const res = await db.query(sql);

    // Also query count of payment anomalies
    let anomalyCount = 0;
    try {
      const anomRes = await db.query(`SELECT COUNT(*) as count FROM commerce.payment_anomalies`);
      anomalyCount = parseInt(anomRes.rows[0]?.count || '0', 10);
    } catch {}

    const orders = res.rows.map((r: any) => ({
      id: r.id,
      orderNumber: r.order_number,
      userId: Number(r.user_id),
      courseId: String(r.course_id),
      courseTitle: courseMap.get(String(r.course_id)) || `Course #${r.course_id}`,
      originalAmount: parseFloat(r.original_amount) || 0,
      discountAmount: parseFloat(r.discount_amount) || 0,
      netPayableAmount: parseFloat(r.net_payable_amount) || 0,
      billingFullName: r.billing_full_name,
      billingEmail: r.billing_email,
      billingPhone: r.billing_phone,
      billingStateCode: r.billing_state_code,
      orderStatus: r.order_status,
      merchantTxnId: r.merchant_txn_id || null,
      gatewayName: r.gateway_name || 'PayU Sandbox',
      gatewayPaymentId: r.gateway_payment_id || null,
      settlementStatus: r.settlement_status || (r.order_status === 'SETTLED' ? 'SETTLED' : 'UNSETTLED'),
      settledAt: r.settled_at || null,
      createdAt: r.created_at,
    }));

    let filtered = orders;
    if (statusParam && statusParam !== 'ALL') {
      filtered = filtered.filter((o) => o.orderStatus === statusParam);
    }

    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.billingFullName.toLowerCase().includes(search) ||
          o.billingEmail.toLowerCase().includes(search) ||
          (o.merchantTxnId && o.merchantTxnId.toLowerCase().includes(search)) ||
          (o.gatewayPaymentId && o.gatewayPaymentId.toLowerCase().includes(search))
      );
    }

    // KPI Metrics calculation
    const totalOrders = orders.length;
    const settledOrders = orders.filter((o) => o.orderStatus === 'SETTLED');
    const totalRevenue = settledOrders.reduce((sum, o) => sum + o.netPayableAmount, 0);
    const pendingCount = orders.filter((o) => o.orderStatus === 'PENDING').length;
    const failedCount = orders.filter((o) => o.orderStatus === 'FAILED' || o.orderStatus === 'USER_CANCELLED').length;

    return NextResponse.json({
      success: true,
      data: filtered,
      metrics: {
        totalOrders,
        settledCount: settledOrders.length,
        totalRevenue,
        pendingCount,
        failedCount,
        anomalyCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
