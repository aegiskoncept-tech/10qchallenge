import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { InvoiceService } from '@/lib/commerce/invoice-service';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const result = await InvoiceService.backfillHistoricalInvoices();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API /api/admin/invoices/backfill POST error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to backfill invoices' },
      { status: 500 }
    );
  }
}
