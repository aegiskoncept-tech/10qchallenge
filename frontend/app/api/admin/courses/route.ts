import { NextRequest, NextResponse } from 'next/server';
import { getAdminCourses, createCourse } from '@/lib/db/courses';
import { assignSubjectsToCourse } from '@/lib/db/subjects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const courses = getAdminCourses(search);

    return NextResponse.json({
      success: true,
      data: courses,
      count: courses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/courses Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch admin courses.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Identify user from header or payload
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = await createCourse(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Persist Course-Subject many-to-many relationships if subjectIds passed
    if (result.course && Array.isArray(body.subjectIds)) {
      await assignSubjectsToCourse(result.course.id, body.subjectIds);
    }

    return NextResponse.json({
      success: true,
      data: result.course,
      message: 'Course created successfully.',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/courses Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create course.' },
      { status: 500 }
    );
  }
}
