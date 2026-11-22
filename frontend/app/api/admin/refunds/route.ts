import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { RefundService } from '@/lib/commerce/refund-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'LIST_ORDERS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const refunds = await RefundService.listRefunds({ search, status });
    return NextResponse.json({
      success: true,
      data: refunds,
      count: refunds.length,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/refunds Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve refunds.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'MANAGE_REFUNDS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const { orderId, amount, reason } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required.' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ success: false, error: 'Refund reason is required.' }, { status: 400 });
    }

    const result = await RefundService.initiateRefund({
      orderId,
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      reason: reason.trim(),
      adminUserId: auth.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, remainingRefundableAmount: result.remainingRefundableAmount },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.refund,
        remainingRefundableAmount: result.remainingRefundableAmount,
        message: 'Refund initiated and processed successfully.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /api/admin/refunds Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process refund.' },
      { status: 500 }
    );
  }
}
