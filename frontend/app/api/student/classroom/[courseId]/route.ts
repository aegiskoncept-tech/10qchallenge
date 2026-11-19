import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { LearningProgressService } from '@/lib/learning/progress-service';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Anti-IDOR: ID derived strictly from authenticated server session
  const authenticatedUserId = auth.user.id;

  // 3. Parse and validate courseId
  const resolvedParams = await params;
  const courseId = parseInt(resolvedParams.courseId, 10);

  if (isNaN(courseId) || courseId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing course ID.' },
      { status: 400 }
    );
  }

  // 4. Validate course existence against canonical Course Master
  const courses = AcademicHierarchyValidator.getCourses();
  const course = courses.find((c) => Number(c.id) === courseId);
  if (!course) {
    return NextResponse.json(
      { success: false, error: `Course #${courseId} does not exist.` },
      { status: 404 }
    );
  }

  // 5. Rate limit: 60 requests per minute
  const rateLimit = checkRateLimit(`classroom_${authenticatedUserId}_${courseId}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down.',
        retryAfter: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  // 6. Server-side enrollment authorization check
  const isEligible = await LearningProgressService.isStudentEligibleForCourse(
    authenticatedUserId,
    courseId
  );
  if (!isEligible) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden: You do not have an active settled enrollment for this course.',
      },
      { status: 403 }
    );
  }

  try {
    // 7. Authoritatively assemble classroom curriculum strictly scoped to authenticated student ID
    const data = await LearningProgressService.getClassroomCurriculum(
      authenticatedUserId,
      courseId
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error(`[GET /api/student/classroom/${courseId} Error]`, err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve classroom curriculum.' },
      { status: 500 }
    );
  }
}
