import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { DoubtService } from '@/lib/doubts/service';
import { DoubtStatus } from '@/lib/doubts/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOUBTS', 'VIEW_DOUBT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const doubtId = parseInt(id, 10);
  if (isNaN(doubtId) || doubtId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid doubt ID.' }, { status: 400 });
  }

  const result = await DoubtService.getAdminDoubtDetail(doubtId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: result.doubt,
    assignments: result.assignments,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOUBTS', 'RESOLVE_DOUBT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const doubtId = parseInt(id, 10);
  if (isNaN(doubtId) || doubtId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid doubt ID.' }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const solutionText = body?.solutionText || body?.message;
  const facultyName = body?.facultyName || auth.user.fullName || 'Academic Faculty';

  if (!solutionText?.trim()) {
    return NextResponse.json({ success: false, error: 'Solution text is required.' }, { status: 400 });
  }

  const replyRes = await DoubtService.addAdminReply(
    auth.user.id,
    { fullName: facultyName, role: auth.user.role === 'ADMIN' ? 'ADMIN' : 'FACULTY' },
    doubtId,
    solutionText.trim(),
    'STUDENT_VISIBLE'
  );

  if (!replyRes.success) {
    return NextResponse.json({ success: false, error: replyRes.error }, { status: 400 });
  }

  // Also update status to RESOLVED if requested
  if (body?.status === 'RESOLVED') {
    await DoubtService.updateStatus(doubtId, 'RESOLVED');
  }

  const updatedDoubt = await DoubtService.getAdminDoubtDetail(doubtId);
  return NextResponse.json({ success: true, data: updatedDoubt.doubt });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOUBTS', 'UPDATE_DOUBT_STATUS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const doubtId = parseInt(id, 10);
  if (isNaN(doubtId) || doubtId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid doubt ID.' }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const status = body?.status as DoubtStatus;
  if (!status) {
    return NextResponse.json({ success: false, error: 'Status is required.' }, { status: 400 });
  }

  const result = await DoubtService.updateStatus(doubtId, status);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: `Status updated to ${status}.` });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOUBTS', 'DELETE_DOUBT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const doubtId = parseInt(id, 10);
  if (isNaN(doubtId) || doubtId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid doubt ID.' }, { status: 400 });
  }

  // Soft delete / resolve or delete
  await DoubtService.updateStatus(doubtId, 'RESOLVED');
  return NextResponse.json({ success: true, message: 'Doubt archived/resolved.' });
}
