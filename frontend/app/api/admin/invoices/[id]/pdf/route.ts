import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { InvoiceService } from '@/lib/commerce/invoice-service';
import { InvoicePdfGenerator } from '@/lib/commerce/invoice-pdf';

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

    const pdfBuffer = InvoicePdfGenerator.generatePdf(invoice);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="10Q-Invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/invoices/[id]/pdf GET error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}
