import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { OrderService } from '@/lib/commerce/order-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
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

    // Strict Anti-IDOR Authorization Check: Order must belong to authenticated student
    if (order.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to access another student\'s order.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (err: any) {
    console.error('[GET /api/student/orders/[id] Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order details.' },
      { status: 500 }
    );
  }
}
