import { NextRequest, NextResponse } from 'next/server';
import { getAdminDoubts } from '@/lib/db/doubts';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'DOUBTS', 'LIST_DOUBTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const subject = searchParams.get('subject') || undefined;

    const list = getAdminDoubts({ search, status, subject });
    return NextResponse.json({ success: true, data: list, count: list.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
