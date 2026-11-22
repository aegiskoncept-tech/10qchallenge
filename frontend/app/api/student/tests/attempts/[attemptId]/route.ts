import { NextRequest, NextResponse } from 'next/server';
import { getAttemptById, checkAndAutoFinalizeAttempt } from '@/lib/db/test-attempts';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
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

    // Auto-finalize if attempt expired while browser was inactive or disconnected
    const attempt = await checkAndAutoFinalizeAttempt(attemptId, auth.user.id) || getAttemptById(attemptId);
    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found.' },
        { status: 404 }
      );
    }

    // Strict Student Ownership Enforcement
    if (attempt.studentId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access forbidden: this test attempt belongs to another student.' },
        { status: 403 }
      );
    }

    // Return sanitized attempt snapshot without internal keys
    const sanitized = {
      id: attempt.id,
      paperId: attempt.paperId,
      paperTitle: attempt.paperTitle,
      examTag: attempt.examTag,
      targetYear: attempt.targetYear,
      durationMinutes: attempt.durationMinutes,
      totalQuestions: attempt.totalQuestions,
      totalMarks: attempt.totalMarks,
      markingScheme: attempt.markingScheme,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      submissionReason: attempt.submissionReason,
      result: attempt.result
        ? {
            attemptId: attempt.result.attemptId,
            paperId: attempt.result.paperId,
            paperTitle: attempt.result.paperTitle,
            examTag: attempt.result.examTag,
            submittedAt: attempt.result.submittedAt,
            submissionReason: attempt.result.submissionReason,
            evaluationStatus: attempt.result.evaluationStatus,
            totalQuestions: attempt.result.totalQuestions,
            attemptedQuestions: attempt.result.attemptedQuestions,
            correctQuestions: attempt.result.correctQuestions,
            incorrectQuestions: attempt.result.incorrectQuestions,
            unattemptedQuestions: attempt.result.unattemptedQuestions,
            positiveMarks: attempt.result.positiveMarks,
            negativeMarks: attempt.result.negativeMarks,
            finalScore: attempt.result.finalScore,
            maximumMarks: attempt.result.maximumMarks,
            accuracy: attempt.result.accuracy,
          }
        : undefined,
    };

    return NextResponse.json({
      success: true,
      data: sanitized,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve test attempt.' },
      { status: 500 }
    );
  }
}
