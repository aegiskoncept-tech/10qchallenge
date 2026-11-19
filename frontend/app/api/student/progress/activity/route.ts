import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { LearningProgressService } from '@/lib/learning/progress-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Parse and validate query parameters
  const { searchParams } = new URL(req.url);
  const rawLimit = searchParams.get('limit');
  const rawCourseId = searchParams.get('courseId');

  let limit = 20;
  if (rawLimit !== null) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return NextResponse.json(
        { success: false, error: 'Limit must be a positive integer.' },
        { status: 400 }
      );
    }
    // Bounded limit: minimum 1, maximum 100
    limit = Math.min(100, Math.max(1, parsedLimit));
  }

  let courseId: number | undefined = undefined;
  if (rawCourseId !== null) {
    const parsedCourseId = parseInt(rawCourseId, 10);
    if (isNaN(parsedCourseId) || parsedCourseId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID parameter.' },
        { status: 400 }
      );
    }
    courseId = parsedCourseId;
  }

  // 3. Rate limiting: 60 requests per minute
  const rateLimit = checkRateLimit(`progress_activity_${auth.user.id}`, 60, 60 * 1000);
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

  // 4. Server-side enrollment authorization check
  let eligibleCourseIds: number[] | undefined = undefined;
  if (courseId) {
    const isEligible = await LearningProgressService.isStudentEligibleForCourse(
      auth.user.id,
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
  } else {
    // If querying activity across all courses, scope strictly to student's settled enrolled courses
    eligibleCourseIds = await LearningProgressService.getStudentEligibleCourseIds(auth.user.id);
    if (eligibleCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          events: [],
          count: 0,
          limit,
        },
      });
    }
  }

  try {
    // 5. Retrieve student learning events strictly scoped to authenticated user ID and eligible courses
    const events = await LearningProgressService.getStudentLearningEvents(
      auth.user.id,
      courseId,
      limit,
      eligibleCourseIds
    );

    // 5. Sanitize events: omit internal database keys or raw metadata
    const sanitizedEvents = events.map((evt) => ({
      id: evt.id,
      courseId: evt.courseId,
      eventType: evt.eventType,
      contentType: evt.contentType,
      contentIdentifier: evt.contentIdentifier,
      subjectId: evt.subjectId,
      chapterId: evt.chapterId,
      topicId: evt.topicId,
      eventAt: evt.eventAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        events: sanitizedEvents,
        count: sanitizedEvents.length,
        limit,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/student/progress/activity Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve learning activity.' },
      { status: 500 }
    );
  }
}
