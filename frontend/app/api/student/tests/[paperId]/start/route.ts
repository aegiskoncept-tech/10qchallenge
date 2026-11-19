import { NextRequest, NextResponse } from 'next/server';
import { getTestSeriesById } from '@/lib/db/test-series';
import { createTestAttempt } from '@/lib/db/test-attempts';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const resolvedParams = await params;
    const paperId = parseInt(resolvedParams.paperId, 10);

    if (isNaN(paperId) || paperId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid test paper ID.' },
        { status: 400 }
      );
    }

    // 1. Authoritative existence & publication check
    const paper = getTestSeriesById(paperId);
    if (!paper) {
      return NextResponse.json(
        { success: false, error: 'Test paper not found.' },
        { status: 404 }
      );
    }

    if (paper.status !== 'Published') {
      return NextResponse.json(
        { success: false, error: 'This test paper is not currently published for attempts.' },
        { status: 403 }
      );
    }

    // 2. Validate essential test parameters & question configuration
    if (!paper.durationMinutes || paper.durationMinutes <= 0) {
      return NextResponse.json(
        { success: false, error: 'Test paper has invalid duration configuration.' },
        { status: 400 }
      );
    }

    if (!paper.questionIds || !Array.isArray(paper.questionIds) || paper.questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This test paper has no questions configured and cannot be attempted.' },
        { status: 400 }
      );
    }

    // 3. Create or reuse active attempt (Idempotent server-side generation)
    const { attempt, isExisting } = createTestAttempt({
      studentId: auth.user.id,
      studentName: auth.user.fullName,
      studentEmail: auth.user.email,
      paperId: paper.id,
      paperTitle: paper.title,
      examTag: paper.examTag || 'BITSAT',
      targetYear: paper.targetYear || 2026,
      durationMinutes: paper.durationMinutes,
      totalQuestions: paper.totalQuestions || 130,
      totalMarks: paper.totalMarks || 390,
    });

    const sanitizedAttempt = {
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
    };

    return NextResponse.json(
      {
        success: true,
        attemptId: attempt.id,
        attempt: sanitizedAttempt,
        isExisting,
        destination: `/student/tests/session/${attempt.id}`,
      },
      { status: isExisting ? 200 : 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize test attempt.' },
      { status: 500 }
    );
  }
}
