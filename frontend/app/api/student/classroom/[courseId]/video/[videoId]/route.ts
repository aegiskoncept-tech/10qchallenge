import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { LearningProgressService } from '@/lib/learning/progress-service';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';
import { readVideosFromDb } from '@/lib/db/videos';
import { getCommerceDb } from '@/lib/commerce/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; videoId: string }> }
) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Anti-IDOR: ID derived strictly from authenticated server session
  const authenticatedUserId = auth.user.id;

  // 3. Parse and validate courseId and videoId
  const resolvedParams = await params;
  const courseId = parseInt(resolvedParams.courseId, 10);
  const videoId = parseInt(resolvedParams.videoId, 10);

  if (isNaN(courseId) || courseId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing course ID.' },
      { status: 400 }
    );
  }

  if (isNaN(videoId) || videoId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing video ID.' },
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
  const rateLimit = checkRateLimit(`classroom_video_${authenticatedUserId}_${courseId}`, 60, 60 * 1000);
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

  // 7. Resolve video from Video Master
  const allVideos = readVideosFromDb();
  const video = allVideos.find((v) => Number(v.id) === videoId);
  if (!video || (video.status && video.status !== 'Published')) {
    return NextResponse.json(
      { success: false, error: `Video #${videoId} not found or unavailable.` },
      { status: 404 }
    );
  }

  // 8. Validate that video strictly belongs to the requested course's academic hierarchy
  const chapters = AcademicHierarchyValidator.getChapters();
  const matchingChapter = chapters.find(
    (ch) =>
      ch.chapterName.trim().toLowerCase() === video.chapter.trim().toLowerCase() ||
      (video as any).chapterId === ch.id
  );

  if (!matchingChapter || Number(matchingChapter.courseId) !== courseId) {
    return NextResponse.json(
      {
        success: false,
        error: `Hierarchy mismatch: Video does not belong to Course #${courseId}.`,
      },
      { status: 403 }
    );
  }

  // 9. Query existing student progress for this video
  let videoStatus = 'NOT_STARTED';
  let completedAt: string | null = null;
  let lastActivityAt: string | null = null;
  try {
    const db = await getCommerceDb();
    const progRes = await db.query(
      `SELECT status, last_activity_at, completed_at
       FROM learning.student_content_progress
       WHERE user_id = $1 AND content_type = 'VIDEO' AND (content_identifier = $2 OR content_identifier = $3);`,
      [authenticatedUserId, String(videoId), String(video.vimeoVideoId || '')]
    );
    if (progRes.rows.length > 0) {
      const p = progRes.rows[0];
      videoStatus = p.status || 'NOT_STARTED';
      completedAt = p.completed_at ? new Date(p.completed_at).toISOString() : null;
      lastActivityAt = p.last_activity_at ? new Date(p.last_activity_at).toISOString() : null;
    }
  } catch (err) {
    // Non-fatal fallback
  }

  // 10. Deliver sanitized playback configuration (never exposing server secrets or private keys)
  return NextResponse.json({
    success: true,
    data: {
      videoId: Number(video.id),
      title: video.title,
      courseId,
      subject: video.subject,
      chapter: video.chapter,
      durationMinutes: Number(video.durationMinutes || 0),
      isFreePreview: Boolean(video.isFreePreview),
      displayOrder: Number(video.displayOrder || 1),
      status: videoStatus,
      completedAt,
      lastActivityAt,
      playbackConfig: {
        provider: (video.provider ? video.provider.toLowerCase() : 'vimeo'),
        vimeoVideoId: video.vimeoVideoId,
        providerVideoId: video.providerVideoId || video.vimeoVideoId,
        videoUrl: video.videoUrl,
        responsive: true,
        speed: true,
        color: '3F328A',
        dnt: true,
        title: false,
        byline: false,
        portrait: false,
      },
    },
  });
}
