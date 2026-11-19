import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { LearningProgressService } from '@/lib/learning/progress-service';
import { LearningContentType, ContentProgressStatus } from '@/lib/learning/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Authenticate student session (also validates CSRF token for mutations)
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Parse request payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'Request body must be a valid JSON object.' },
      { status: 400 }
    );
  }

  // 3. Security: Prevent IDOR / spoofed identity
  if ('userId' in body && body.userId !== undefined) {
    if (Number(body.userId) !== auth.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Client-supplied userId does not match authenticated session identity.',
        },
        { status: 400 }
      );
    }
  }

  const { courseId, contentType, contentIdentifier, status, idempotencyKey } = body;

  const numericCourseId = parseInt(courseId, 10);
  if (isNaN(numericCourseId) || numericCourseId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing course ID.' },
      { status: 400 }
    );
  }

  if (!contentType || !['VIDEO', 'PDF'].includes(contentType)) {
    return NextResponse.json(
      { success: false, error: 'Invalid content type. Must be "VIDEO" or "PDF".' },
      { status: 400 }
    );
  }

  if (!contentIdentifier || typeof contentIdentifier !== 'string' || contentIdentifier.trim() === '') {
    return NextResponse.json(
      { success: false, error: 'Content identifier must be a non-empty string.' },
      { status: 400 }
    );
  }

  if (!status || !['IN_PROGRESS', 'COMPLETED'].includes(status)) {
    return NextResponse.json(
      { success: false, error: 'Invalid status. Must be "IN_PROGRESS" or "COMPLETED".' },
      { status: 400 }
    );
  }

  if (idempotencyKey && typeof idempotencyKey !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Idempotency key must be a string.' },
      { status: 400 }
    );
  }

  // 4. Rate limiting: 60 mutations per minute
  const rateLimit = checkRateLimit(`progress_content_mut_${auth.user.id}`, 60, 60 * 1000);
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

  // 5. Server-side enrollment authorization check
  const isEligible = await LearningProgressService.isStudentEligibleForCourse(
    auth.user.id,
    numericCourseId
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
    // 6. Record content progress via authoritative service layer
    const result = await LearningProgressService.recordContentProgress({
      userId: auth.user.id,
      courseId: numericCourseId,
      contentType: contentType as LearningContentType,
      contentIdentifier: contentIdentifier.trim(),
      status: status as ContentProgressStatus,
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
    });

    // 6. Return sanitized progress record — strictly omitting internal file paths, credentials, or protected URLs
    const sanitizedRecord = {
      id: result.record.id,
      courseId: result.record.courseId,
      contentType: result.record.contentType,
      contentIdentifier: result.record.contentIdentifier,
      status: result.record.status,
      lastActivityAt: result.record.lastActivityAt,
      completedAt: result.record.completedAt,
    };

    return NextResponse.json({
      success: true,
      data: {
        record: sanitizedRecord,
        eventRecorded: result.eventRecorded,
      },
    });
  } catch (err: any) {
    const message = err?.message || 'Failed to record content progress.';
    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }
    if (
      message.includes('Hierarchy mismatch') ||
      message.includes('does not exist') ||
      message.includes('not found') ||
      message.includes('Invalid') ||
      message.includes('Unsupported')
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    console.error('[POST /api/student/progress/content Error]', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
