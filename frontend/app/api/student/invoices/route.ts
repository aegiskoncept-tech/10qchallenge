import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { InvoiceService } from '@/lib/commerce/invoice-service';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const invoices = await InvoiceService.listStudentInvoices(Number(auth.user.id));
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('[API /api/student/invoices GET error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list student invoices' },
      { status: 500 }
    );
  }
}
