import { NextRequest, NextResponse } from 'next/server';
import { getCommerceDb } from '@/lib/commerce/db';
import { readCoursesFromDb } from '@/lib/db/courses';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'INVOICES', 'LIST_INVOICES');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const statusParam = searchParams.get('status');

    const db = await getCommerceDb();
    const courses = readCoursesFromDb();
    const courseMap = new Map<string, string>();
    courses.forEach((c) => courseMap.set(String(c.id), c.title));

    // Query orders joined with payment attempts and authoritative settlement payments
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

    // Map and enrich rows
    const invoices = res.rows.map((r: any) => {
      const netAmount = parseFloat(r.net_payable_amount) || 0;
      // Tax-inclusive pricing (18% GST):
      // Base = Net / 1.18, GST = Net - Base
      const baseAmount = Math.round((netAmount / 1.18) * 100) / 100;
      const gstAmount = Math.round((netAmount - baseAmount) * 100) / 100;

      const courseTitle = courseMap.get(String(r.course_id)) || `Course #${r.course_id}`;

      return {
        id: r.id,
        orderNumber: r.order_number,
        invoiceNumber: `INV-${r.order_number.replace('10Q-ORD-', '')}`,
        userId: Number(r.user_id),
        courseId: r.course_id,
        courseTitle,
        studentName: r.billing_full_name || 'Student',
        studentEmail: r.billing_email,
        studentPhone: r.billing_phone || '',
        stateCode: r.billing_state_code || 'IN',
        originalAmount: parseFloat(r.original_amount) || netAmount,
        discountAmount: parseFloat(r.discount_amount) || 0,
        netPayableAmount: netAmount,
        baseAmount,
        gstAmount,
        orderStatus: r.order_status,
        settlementStatus: r.settlement_status || (r.order_status === 'COMPLETED' ? 'SETTLED' : 'PENDING'),
        gatewayPaymentId: r.gateway_payment_id || null,
        settledAt: r.settled_at || null,
        createdAt: r.created_at,
      };
    });

    // Apply filtering
    let filtered = invoices;
    if (search) {
      filtered = filtered.filter(
        (inv: any) =>
          inv.orderNumber.toLowerCase().includes(search) ||
          inv.studentName.toLowerCase().includes(search) ||
          inv.studentEmail.toLowerCase().includes(search) ||
          inv.courseTitle.toLowerCase().includes(search) ||
          (inv.gatewayPaymentId && inv.gatewayPaymentId.toLowerCase().includes(search))
      );
    }

    if (statusParam && statusParam !== 'ALL') {
      filtered = filtered.filter((inv: any) => inv.settlementStatus === statusParam);
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/invoices Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch invoice records.' },
      { status: 500 }
    );
  }
}
