import { NextRequest, NextResponse } from 'next/server';
import { getAdminTestSeries, createTestSeries } from '@/lib/db/test-series';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'LIST_TESTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const exam = searchParams.get('exam') || undefined;

    const list = getAdminTestSeries(search, exam);
    return NextResponse.json({ success: true, data: list, count: list.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'CREATE_TEST');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const result = await createTestSeries(body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.testSeries }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
