import { NextRequest, NextResponse } from 'next/server';
import { getCourseBySlugOrId, updateCourse, deleteCourse } from '@/lib/db/courses';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const course = getCourseBySlugOrId(id, true);

    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: course });
  } catch (error: any) {
    console.error('[GET /api/admin/courses/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courseId = Number(id);

    if (isNaN(courseId)) {
      return NextResponse.json({ success: false, error: 'Invalid course ID.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = updateCourse(courseId, body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.course,
      message: 'Course updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/courses/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courseId = Number(id);

    if (isNaN(courseId)) {
      return NextResponse.json({ success: false, error: 'Invalid course ID.' }, { status: 400 });
    }

    const result = deleteCourse(courseId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/courses/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}
