import { NextRequest, NextResponse } from 'next/server';
import { saveStudentAnswer } from '@/lib/db/test-attempts';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  // 1. Authenticate Student (with CSRF verification)
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
    const {
      questionId,
      questionType,
      selectedOption,
      numericalValue,
      isMarkedForReview,
      clientVersion,
    } = body;

    if (questionId === undefined || questionId === null) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required.' },
        { status: 400 }
      );
    }

    // 2. Authoritative save execution with concurrency locking & validations
    const result = await saveStudentAnswer({
      attemptId,
      studentId: auth.user.id,
      questionId: Number(questionId),
      questionType: questionType || 'objective',
      selectedOption,
      numericalValue,
      isMarkedForReview,
      clientVersion: typeof clientVersion === 'number' ? clientVersion : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to save answer.' },
        { status: result.status || 400 }
      );
    }

    // 3. Return Sanitized Response Confirmation
    return NextResponse.json({
      success: true,
      attemptId,
      response: result.response,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process answer save.' },
      { status: 500 }
    );
  }
}
