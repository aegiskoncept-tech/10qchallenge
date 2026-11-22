import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { OrderService } from '@/lib/commerce/order-service';
import { getCommerceDb } from '@/lib/commerce/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'ORDERS', 'VIEW_ORDER');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Order ID is required.' }, { status: 400 });
  }

  try {
    const order = await OrderService.getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
    }

    // Also fetch audit events
    const db = await getCommerceDb();
    const eventsRes = await db.query(
      `SELECT * FROM commerce.payment_events WHERE order_id = $1 ORDER BY created_at ASC;`,
      [order.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        events: eventsRes.rows,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/orders/[id] Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order details.' },
      { status: 500 }
    );
  }
}
