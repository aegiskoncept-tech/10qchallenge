import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { DoubtService } from '@/lib/doubts/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'DOUBTS', 'LIST_DOUBTS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const courseId = searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!, 10) : undefined;
    const subjectId = searchParams.get('subjectId') ? parseInt(searchParams.get('subjectId')!, 10) : undefined;
    const assignedFacultyId = searchParams.get('assignedFacultyId')
      ? parseInt(searchParams.get('assignedFacultyId')!, 10)
      : undefined;

    const { list, metrics } = await DoubtService.getAdminDoubts({
      search,
      status,
      courseId,
      subjectId,
      assignedFacultyId,
    });

    return NextResponse.json({
      success: true,
      data: list,
      metrics,
      count: list.length,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/doubts Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve doubts.' },
      { status: 500 }
    );
  }
}
