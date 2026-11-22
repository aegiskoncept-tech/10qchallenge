import { NextRequest, NextResponse } from 'next/server';
import { getTestSeriesById } from '@/lib/db/test-series';
import { createTestAttempt, getAttemptsForStudent } from '@/lib/db/test-attempts';
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

    // Availability Window Verification
    if (paper.startDate) {
      const startMs = new Date(paper.startDate).getTime();
      if (!isNaN(startMs) && startMs > Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: `This examination is scheduled to open on ${new Date(paper.startDate).toLocaleString()}. Early access is restricted.`,
          },
          { status: 403 }
        );
      }
    }

    if (paper.endDate) {
      const endMs = new Date(paper.endDate).getTime();
      if (!isNaN(endMs) && endMs < Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: `The examination window closed on ${new Date(paper.endDate).toLocaleString()}. New attempts cannot be started.`,
          },
          { status: 403 }
        );
      }
    }

    // Attempt Limits Enforcement
    const studentAttempts = getAttemptsForStudent(auth.user.id);
    const completedAttemptsCount = studentAttempts.filter(
      (a) => Number(a.paperId) === paperId && (a.status === 'COMPLETED' || a.status === 'ABANDONED')
    ).length;

    const maxAllowed = (paper as any).maxAttempts || (paper as any).allowedAttempts;
    if (typeof maxAllowed === 'number' && maxAllowed > 0 && completedAttemptsCount >= maxAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: `You have reached the maximum allowed attempts (${maxAllowed}) for this examination.`,
        },
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
    const { attempt, isExisting } = await createTestAttempt({
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
