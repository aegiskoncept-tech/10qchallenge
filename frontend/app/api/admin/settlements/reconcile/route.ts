import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { SettlementService } from '@/lib/commerce/settlement-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'MANAGE_SETTLEMENTS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'paymentId is required.' }, { status: 400 });
    }

    const result = await SettlementService.reconcilePayment(paymentId, auth.user.id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/settlements/reconcile Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to reconcile payment.' },
      { status: 500 }
    );
  }
}
