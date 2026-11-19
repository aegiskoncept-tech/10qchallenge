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

  // 2. Rate limit: 60 requests per minute per authenticated student
  const rateLimit = checkRateLimit(`progress_summary_${auth.user.id}`, 60, 60 * 1000);
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

  try {
    // 3. Retrieve student learning progress overall summary
    const summary = await LearningProgressService.getStudentOverallSummary(auth.user.id);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    console.error('[GET /api/student/progress/summary Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve progress summary.' },
      { status: 500 }
    );
  }
}
