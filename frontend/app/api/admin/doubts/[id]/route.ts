import { NextRequest, NextResponse } from 'next/server';
import { resolveDoubt, deleteDoubt } from '@/lib/db/doubts';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, 'DOUBTS', 'RESOLVE_DOUBT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const body = await req.json();
  const { solutionText, facultyName } = body;

  const result = await resolveDoubt(
    Number(id),
    solutionText,
    facultyName || auth.user.fullName || 'Academic Faculty'
  );

  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, data: result.doubt });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, 'DOUBTS', 'DELETE_DOUBT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const result = await deleteDoubt(Number(id));
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, message: 'Doubt removed.' });
}
