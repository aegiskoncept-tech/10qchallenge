import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { DoubtService } from '@/lib/doubts/service';

export const dynamic = 'force-dynamic';

export async function GET(
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

  const result = await DoubtService.getStudentDoubtDetail(auth.user.id, doubtId);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 404 }
    );
  }

  return NextResponse.json({ success: true, data: result.doubt });
}
