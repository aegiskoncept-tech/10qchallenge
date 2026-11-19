import { NextRequest, NextResponse } from 'next/server';
import { submitTestAttempt } from '@/lib/db/test-attempts';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  // 1. Authenticate Student (with CSRF verification on POST)
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

    const body = await req.json().catch(() => ({}));
    const submissionReason =
      body.submissionReason === 'TIMEOUT' ? 'TIMEOUT' : 'MANUAL';

    // 2. Authoritative submission and evaluation execution with cross-process locking
    const outcome = await submitTestAttempt({
      attemptId,
      studentId: auth.user.id,
      submissionReason,
    });

    if (!outcome.success || !outcome.result) {
      return NextResponse.json(
        { success: false, error: outcome.error || 'Failed to submit test attempt.' },
        { status: outcome.status || 400 }
      );
    }

    // 3. Return sanitized evaluation summary (Answer-Key and Solution Protection)
    const sanitizedResult = {
      attemptId: outcome.result.attemptId,
      paperId: outcome.result.paperId,
      paperTitle: outcome.result.paperTitle,
      examTag: outcome.result.examTag,
      submittedAt: outcome.result.submittedAt,
      submissionReason: outcome.result.submissionReason,
      evaluationStatus: outcome.result.evaluationStatus,
      totalQuestions: outcome.result.totalQuestions,
      attemptedQuestions: outcome.result.attemptedQuestions,
      correctQuestions: outcome.result.correctQuestions,
      incorrectQuestions: outcome.result.incorrectQuestions,
      unattemptedQuestions: outcome.result.unattemptedQuestions,
      positiveMarks: outcome.result.positiveMarks,
      negativeMarks: outcome.result.negativeMarks,
      finalScore: outcome.result.finalScore,
      maximumMarks: outcome.result.maximumMarks,
      accuracy: outcome.result.accuracy,
    };

    return NextResponse.json(
      {
        success: true,
        attemptId,
        isExisting: outcome.isExisting || false,
        result: sanitizedResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process test submission.' },
      { status: 500 }
    );
  }
}
