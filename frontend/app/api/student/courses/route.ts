import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { getStudentCoursesData } from '@/lib/db/student-courses';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    // 2. Query authoritative enrolled courses strictly scoped to authenticated student ID
    const data = await getStudentCoursesData(auth.user.id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('[GET /api/student/courses Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve student courses.' },
      { status: 500 }
    );
  }
}
