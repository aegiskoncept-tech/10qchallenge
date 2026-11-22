import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { InvoiceService } from '@/lib/commerce/invoice-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const invoiceId = resolvedParams.id;

    const invoice = await InvoiceService.getInvoiceById(invoiceId, undefined, true);
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    console.error('[API /api/admin/invoices/[id] GET error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}
