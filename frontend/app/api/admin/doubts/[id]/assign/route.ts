import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { DoubtService } from '@/lib/doubts/service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOUBTS', 'ASSIGN_DOUBT');
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

  const facultyId = parseInt(body?.facultyId, 10);
  const facultyName = (body?.facultyName || '').trim();
  const notes = body?.notes;

  if (isNaN(facultyId) || facultyId <= 0) {
    return NextResponse.json({ success: false, error: 'Valid faculty ID is required.' }, { status: 400 });
  }
  if (!facultyName) {
    return NextResponse.json({ success: false, error: 'Faculty name is required.' }, { status: 400 });
  }

  const result = await DoubtService.assignFaculty(
    auth.user.id,
    doubtId,
    facultyId,
    facultyName,
    notes
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: `Doubt assigned to ${facultyName}.` });
}
