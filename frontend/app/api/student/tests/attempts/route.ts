import { NextRequest, NextResponse } from 'next/server';
import { getAttemptsForStudent } from '@/lib/db/test-attempts';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const paperIdParam = searchParams.get('paperId');
    const statusParam = searchParams.get('status');

    let attempts = getAttemptsForStudent(auth.user.id);

    if (paperIdParam) {
      const pid = Number(paperIdParam);
      if (!isNaN(pid)) {
        attempts = attempts.filter((a) => Number(a.paperId) === pid);
      }
    }

    if (statusParam && statusParam !== 'ALL') {
      attempts = attempts.filter((a) => a.status === statusParam);
    }

    // Calculate attempt numbering per paper (chronological)
    const paperAttemptCounter = new Map<number, number>();
    const chronological = [...attempts].reverse();
    const attemptNumberMap = new Map<string, number>();

    for (const a of chronological) {
      const cur = (paperAttemptCounter.get(a.paperId) || 0) + 1;
      paperAttemptCounter.set(a.paperId, cur);
      attemptNumberMap.set(a.id, cur);
    }

    // Sanitize attempt records for student presentation (no answer keys or snapshots)
    const sanitized = attempts.map((a) => {
      const percentage =
        a.result && a.result.maximumMarks > 0
          ? Number(((a.result.finalScore / a.result.maximumMarks) * 100).toFixed(2))
          : null;

      return {
        id: a.id,
        attemptNumber: attemptNumberMap.get(a.id) || 1,
        paperId: a.paperId,
        paperTitle: a.paperTitle,
        examTag: a.examTag,
        targetYear: a.targetYear,
        durationMinutes: a.durationMinutes,
        totalQuestions: a.totalQuestions,
        totalMarks: a.totalMarks,
        startedAt: a.startedAt,
        expiresAt: a.expiresAt,
        status: a.status,
        submittedAt: a.submittedAt || null,
        submissionReason: a.submissionReason || null,
        score: a.result?.finalScore ?? null,
        maximumMarks: a.result?.maximumMarks ?? a.totalMarks,
        percentage,
        accuracy: a.result?.accuracy ?? null,
        attemptedQuestions: a.result?.attemptedQuestions ?? null,
        correctQuestions: a.result?.correctQuestions ?? null,
        incorrectQuestions: a.result?.incorrectQuestions ?? null,
        unattemptedQuestions: a.result?.unattemptedQuestions ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve student attempt history.' },
      { status: 500 }
    );
  }
}
