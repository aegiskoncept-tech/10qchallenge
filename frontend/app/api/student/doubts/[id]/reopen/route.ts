import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
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

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const reason = body?.reason;
  const result = await DoubtService.reopenDoubt(auth.user.id, auth.user.fullName, doubtId, reason);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, message: 'Doubt successfully reopened.' });
}
