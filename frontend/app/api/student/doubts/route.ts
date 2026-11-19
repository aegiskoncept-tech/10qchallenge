import { NextRequest, NextResponse } from 'next/server';
import { getStudentDoubts, createDoubt } from '@/lib/db/doubts';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const list = getStudentDoubts(auth.user.id);
  return NextResponse.json({ success: true, data: list, count: list.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const result = await createDoubt({
      ...body,
      studentId: auth.user.id,
      studentName: auth.user.fullName,
      studentEmail: auth.user.email,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.doubt }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
