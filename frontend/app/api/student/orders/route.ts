import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { OrderService } from '@/lib/commerce/order-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const orders = await OrderService.getStudentOrders(auth.user.id);
    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (err: any) {
    console.error('[GET /api/student/orders Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve orders.' },
      { status: 500 }
    );
  }
}
