import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { DoubtService } from '@/lib/doubts/service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const doubtId = parseInt(id, 10);
  if (isNaN(doubtId) || doubtId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid doubt ID.' },
      { status: 400 }
    );
  }

  const rl = checkRateLimit(`doubt_reply_${auth.user.id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }

  const message = body?.message;
  const attachments = body?.attachments;

  const result = await DoubtService.addStudentReply(
    auth.user.id,
    auth.user.fullName,
    doubtId,
    message,
    attachments
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, data: result.reply }, { status: 201 });
}
