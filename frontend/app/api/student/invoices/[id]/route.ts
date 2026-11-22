import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { InvoiceService } from '@/lib/commerce/invoice-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const invoiceId = resolvedParams.id;

    const invoice = await InvoiceService.getInvoiceById(
      invoiceId,
      Number(auth.user.id),
      auth.user.role === 'ADMIN'
    );

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    if (error.message?.includes('FORBIDDEN')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error('[API /api/student/invoices/[id] GET error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}
