import { NextRequest, NextResponse } from 'next/server';
import { getAttemptById, checkAndAutoFinalizeAttempt } from '@/lib/db/test-attempts';
import { getQuestionsForTestPaper } from '@/lib/db/test-series';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  // 1. Authenticate Student
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

    // 2. Fetch Authoritative Attempt Record
    const attempt = getAttemptById(attemptId);
    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found.' },
        { status: 404 }
      );
    }

    // 3. Strict Student Ownership Verification
    if (attempt.studentId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access forbidden: this test attempt belongs to another student.' },
        { status: 403 }
      );
    }

    // 4. Verify Attempt Status
    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: `Test attempt is ${attempt.status.toLowerCase().replace('_', ' ')}. Question access is closed.` },
        { status: 403 }
      );
    }

    // 5. Authoritative Expiry Enforcement
    const now = Date.now();
    const expiryMs = new Date(attempt.expiresAt).getTime();
    if (now >= expiryMs) {
      await checkAndAutoFinalizeAttempt(attemptId, auth.user.id);
      return NextResponse.json(
        {
          success: false,
          error: 'Test attempt has expired. Question access is locked.',
          isExpired: true,
          destination: `/student/tests/results/${attempt.id}`,
        },
        { status: 403 }
      );
    }

    // 6. Retrieve Assigned Questions (Strictly prefer attempt's immutable question snapshot)
    let sanitizedQuestions: any[] = [];
    let subjectList: Array<{ id: number; name: string; questionCount: number }> = [];

    if (attempt.questionSnapshots && Object.keys(attempt.questionSnapshots).length > 0) {
      const snapshots = Object.values(attempt.questionSnapshots);
      sanitizedQuestions = snapshots.map((s, idx) => {
        const item: any = {
          id: s.id,
          questionNumber: idx + 1,
          questionType: s.questionType,
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          chapterId: s.chapterId,
          chapterName: s.chapterName,
          questionContent: s.questionContent,
          difficulty: s.difficulty,
          orderNumber: s.orderNumber,
        };
        if (s.questionType === 'objective') {
          item.optionA = s.optionA;
          item.optionB = s.optionB;
          item.optionC = s.optionC;
          item.optionD = s.optionD;
        }
        return item;
      });

      const subCountMap = new Map<number, { id: number; name: string; questionCount: number }>();
      sanitizedQuestions.forEach((q) => {
        const existing = subCountMap.get(q.subjectId);
        if (existing) {
          existing.questionCount++;
        } else {
          subCountMap.set(q.subjectId, {
            id: q.subjectId,
            name: q.subjectName,
            questionCount: 1,
          });
        }
      });
      subjectList = Array.from(subCountMap.values());
    } else {
      // Fallback for legacy attempts created prior to snapshotting: resolve authoritatively against attempt's paper version
      const result = getQuestionsForTestPaper(attempt.paperId, attempt.paperVersion || 1);
      if (!result.success || !result.questions) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to retrieve questions for this test paper.' },
          { status: 404 }
        );
      }
      sanitizedQuestions = result.questions;
      subjectList = result.subjects || [];
    }

    if (sanitizedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This test paper has no questions linked and cannot be served.' },
        { status: 404 }
      );
    }

    // 7. Return Sanitized CBT Payload with Saved Responses for Refresh Recovery
    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      paperId: attempt.paperId,
      paperVersion: attempt.paperVersion || 1,
      paperTitle: attempt.paperTitle,
      examTag: attempt.examTag,
      targetYear: attempt.targetYear,
      durationMinutes: attempt.durationMinutes,
      markingScheme: attempt.markingScheme,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      totalQuestions: sanitizedQuestions.length,
      subjects: subjectList,
      questions: sanitizedQuestions,
      savedResponses: attempt.responses || {},
      visitedQuestionIds: attempt.visitedQuestionIds || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load test questions.' },
      { status: 500 }
    );
  }
}
