import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { getStudentDashboardData } from '@/lib/db/student-dashboard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    // 2. Query authoritative dashboard data strictly scoped to authenticated user
    const data = await getStudentDashboardData(auth.user.id);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Student record could not be found.' },
        { status: 404 }
      );
    }

    // 3. Return sanitized, validated dashboard DTO
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve student dashboard data.' },
      { status: 500 }
    );
  }
}
