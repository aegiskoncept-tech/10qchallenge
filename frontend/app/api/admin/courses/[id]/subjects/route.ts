import { NextRequest, NextResponse } from 'next/server';
import { getSubjectsForCourse, assignSubjectsToCourse } from '@/lib/db/subjects';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'COURSES', 'GET_COURSE_SUBJECTS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const courseId = Number(id);

    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric course ID required.' }, { status: 400 });
    }

    const subjects = getSubjectsForCourse(courseId);

    return NextResponse.json({
      success: true,
      data: subjects,
      count: subjects.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/courses/[id]/subjects Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'COURSES', 'UPDATE_COURSE_SUBJECTS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const courseId = Number(id);

    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric course ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const subjectIds = Array.isArray(body.subjectIds)
      ? body.subjectIds
      : Array.isArray(body)
      ? body
      : [];

    const result = await assignSubjectsToCourse(courseId, subjectIds);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const updatedSubjects = getSubjectsForCourse(courseId);

    return NextResponse.json({
      success: true,
      data: updatedSubjects,
      assignedCount: result.assignedCount,
      message: 'Course subjects successfully updated.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/courses/[id]/subjects Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}
