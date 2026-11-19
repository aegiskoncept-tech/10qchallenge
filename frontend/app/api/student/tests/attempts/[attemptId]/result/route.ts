import { NextRequest, NextResponse } from 'next/server';
import { getAttemptById } from '@/lib/db/test-attempts';
import { buildAttemptScorecard } from '@/lib/db/test-evaluation';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const resolvedParams = await params;
    const attemptId = resolvedParams.attemptId?.trim();

    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: 'Attempt ID is required.' },
        { status: 400 }
      );
    }

    const attempt = getAttemptById(attemptId);
    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found.' },
        { status: 404 }
      );
    }

    // 2. Strict Student Ownership Enforcement
    if (attempt.studentId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access forbidden: this test result belongs to another student.' },
        { status: 403 }
      );
    }

    // 3. Status Guard: Must be COMPLETED
    if (attempt.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Test attempt is still in progress. Scorecard is accessible only after test submission.',
          attemptStatus: attempt.status,
        },
        { status: 400 }
      );
    }

    if (!attempt.result) {
      return NextResponse.json(
        { success: false, error: 'Authoritative evaluation result not found for this completed attempt.' },
        { status: 500 }
      );
    }

    // 4. Build Authoritative Server-Side Scorecard DTO
    const scorecard = buildAttemptScorecard(attempt);
    if (!scorecard) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate scorecard from authoritative evaluation data.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scorecard,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve test scorecard.' },
      { status: 500 }
    );
  }
}
