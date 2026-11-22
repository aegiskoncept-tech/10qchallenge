import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { DoubtService } from '@/lib/doubts/service';
import { ReplyVisibility } from '@/lib/doubts/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOUBTS', 'REPLY_DOUBT');
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

  const message = body?.message;
  const visibility: ReplyVisibility = body?.visibility === 'INTERNAL_NOTE' ? 'INTERNAL_NOTE' : 'STUDENT_VISIBLE';
  const facultyName = body?.facultyName || auth.user.fullName || 'Academic Faculty';
  const attachments = body?.attachments;

  const result = await DoubtService.addAdminReply(
    auth.user.id,
    { fullName: facultyName, role: auth.user.role === 'ADMIN' ? 'ADMIN' : 'FACULTY' },
    doubtId,
    message,
    visibility,
    attachments
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result.reply }, { status: 201 });
}
