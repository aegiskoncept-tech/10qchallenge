import { NextRequest, NextResponse } from 'next/server';
import { getAdminCourses, createCourse, deleteCourse } from '@/lib/db/courses';
import { assignSubjectsToCourse } from '@/lib/db/subjects';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'COURSES', 'LIST_COURSES');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

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
  const auth = await requireAdmin(req, 'COURSES', 'CREATE_COURSE');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();

    // Authenticated admin user recorded from verified server session
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    const result = await createCourse(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Persist Course-Subject many-to-many relationships if subjectIds passed
    if (result.course && Array.isArray(body.subjectIds) && body.subjectIds.length > 0) {
      const assignRes = await assignSubjectsToCourse(result.course.id, body.subjectIds);
      if (!assignRes.success) {
        // Transactional rollback of newly created course to prevent inconsistent state
        await deleteCourse(result.course.id);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to assign subjects: ${assignRes.error || 'Unknown error'}. Course creation was rolled back.`,
          },
          { status: 400 }
        );
      }
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
