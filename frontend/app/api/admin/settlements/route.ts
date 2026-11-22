import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { SettlementService } from '@/lib/commerce/settlement-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'LIST_ORDERS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const summary = await SettlementService.getSettlementSummary();
    const settlements = await SettlementService.listSettlements();

    return NextResponse.json({
      success: true,
      summary,
      settlements,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/settlements Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve settlement summary.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'ORDERS', 'MANAGE_SETTLEMENTS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const {
      settlementReference,
      settlementDate,
      grossAmount,
      refundAmount,
      gatewayFee,
      taxOnFee,
      netSettlementAmount,
      sourceReference,
      metadata,
    } = body;

    if (!settlementReference || !settlementDate || grossAmount === undefined || netSettlementAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'settlementReference, settlementDate, grossAmount, and netSettlementAmount are required.' },
        { status: 400 }
      );
    }

    const record = await SettlementService.createSettlementRecord({
      settlementReference,
      settlementDate,
      grossAmount: parseFloat(grossAmount),
      refundAmount: refundAmount ? parseFloat(refundAmount) : 0,
      gatewayFee: gatewayFee ? parseFloat(gatewayFee) : undefined,
      taxOnFee: taxOnFee ? parseFloat(taxOnFee) : undefined,
      netSettlementAmount: parseFloat(netSettlementAmount),
      sourceReference,
      metadata,
      adminUserId: auth.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: record,
        message: 'Settlement record created/updated successfully.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /api/admin/settlements Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create settlement record.' },
      { status: 500 }
    );
  }
}
