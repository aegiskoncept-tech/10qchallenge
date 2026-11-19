import { NextRequest, NextResponse } from 'next/server';
import { getTestSeriesById, updateTestSeries, deleteTestSeries } from '@/lib/db/test-series';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'GET_TEST');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const test = getTestSeriesById(Number(id));
  if (!test) return NextResponse.json({ success: false, error: 'Test not found.' }, { status: 404 });
  return NextResponse.json({ success: true, data: test });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'UPDATE_TEST');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const body = await req.json();
  const adminUser = `${auth.user.fullName} (${auth.user.email})`;
  const result = await updateTestSeries(Number(id), body, adminUser);
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, data: result.testSeries });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'DELETE_TEST');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const result = await deleteTestSeries(Number(id));
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, message: 'Test deleted.' });
}
