import { NextRequest, NextResponse } from 'next/server';
import {
  getTestSeriesById,
  updateTestSeries,
  calculateTestPaperMetrics,
  TestSeriesRecord,
  MarkingSchemeConfig,
} from '@/lib/db/test-series';
import { readQuestionsFromDb, QuestionRecord } from '@/lib/db/questions';
import { readSubjectsFromDb } from '@/lib/db/subjects';
import { readChaptersFromDb } from '@/lib/db/chapters';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { AuthDb } from '@/lib/auth/database';

export const dynamic = 'force-dynamic';

interface EnrichedQuestion extends QuestionRecord {
  subjectName: string;
  chapterName: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'VIEW');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const paperId = Number(id);
  const paper = getTestSeriesById(paperId);

  if (!paper) {
    return NextResponse.json(
      { success: false, error: 'Test paper not found.' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const subjectIdParam = searchParams.get('subjectId');
  const chapterIdParam = searchParams.get('chapterId');
  const typeParam = searchParams.get('type');
  const difficultyParam = searchParams.get('difficulty');
  const searchParam = searchParams.get('search');

  const allQuestions = readQuestionsFromDb();
  const allSubjects = readSubjectsFromDb().filter((s) => s.isActive !== false);
  const allChapters = readChaptersFromDb().filter((c) => c.isActive !== false);

  const subjectMap = new Map<number, string>();
  allSubjects.forEach((s) => subjectMap.set(Number(s.id), s.subjectName));

  const chapterMap = new Map<number, string>();
  allChapters.forEach((c) => chapterMap.set(Number(c.id), c.chapterName));

  // Map for all questions
  const questionMap = new Map<number, QuestionRecord>();
  allQuestions.forEach((q) => questionMap.set(Number(q.id), q));

  // Build linked questions in exact order of paper.questionIds
  const linkedQuestionIds = paper.questionIds || [];
  const linkedQuestions: EnrichedQuestion[] = [];
  const linkedIdSet = new Set<number>();

  for (const qId of linkedQuestionIds) {
    const q = questionMap.get(Number(qId));
    if (q) {
      linkedIdSet.add(Number(qId));
      linkedQuestions.push({
        ...q,
        subjectName: subjectMap.get(Number(q.subjectId)) || `Subject #${q.subjectId}`,
        chapterName: chapterMap.get(Number(q.chapterId)) || `Chapter #${q.chapterId}`,
      });
    }
  }

  // Filter available questions (active and not already linked)
  let availableQuestions: EnrichedQuestion[] = allQuestions
    .filter((q) => q.isActive !== false)
    .map((q) => ({
      ...q,
      subjectName: subjectMap.get(Number(q.subjectId)) || `Subject #${q.subjectId}`,
      chapterName: chapterMap.get(Number(q.chapterId)) || `Chapter #${q.chapterId}`,
    }));

  if (subjectIdParam) {
    const sId = Number(subjectIdParam);
    availableQuestions = availableQuestions.filter((q) => Number(q.subjectId) === sId);
  }

  if (chapterIdParam) {
    const chId = Number(chapterIdParam);
    availableQuestions = availableQuestions.filter((q) => Number(q.chapterId) === chId);
  }

  if (typeParam && (typeParam === 'objective' || typeParam === 'numerical')) {
    availableQuestions = availableQuestions.filter((q) => q.questionType === typeParam);
  }

  if (difficultyParam) {
    availableQuestions = availableQuestions.filter(
      (q) => q.difficulty?.toLowerCase() === difficultyParam.toLowerCase()
    );
  }

  if (searchParam && searchParam.trim()) {
    const qTerm = searchParam.trim().toLowerCase();
    availableQuestions = availableQuestions.filter(
      (q) =>
        q.questionContent.toLowerCase().includes(qTerm) ||
        (q.optionA && q.optionA.toLowerCase().includes(qTerm)) ||
        (q.optionB && q.optionB.toLowerCase().includes(qTerm)) ||
        (q.optionC && q.optionC.toLowerCase().includes(qTerm)) ||
        (q.optionD && q.optionD.toLowerCase().includes(qTerm)) ||
        String(q.id) === qTerm
    );
  }

  const metrics = calculateTestPaperMetrics(linkedQuestionIds, paper.markingScheme);

  return NextResponse.json({
    success: true,
    data: {
      paper: {
        id: paper.id,
        title: paper.title,
        examTag: paper.examTag,
        targetYear: paper.targetYear,
        description: paper.description,
        durationMinutes: paper.durationMinutes,
        totalQuestions: metrics.totalQuestions,
        totalMarks: metrics.totalMarks,
        price: paper.price,
        status: paper.status,
        version: paper.version || 1,
        markingScheme: paper.markingScheme || { positiveMarks: 3, negativeMarks: 1 },
        createdAt: paper.createdAt,
        updatedAt: paper.updatedAt,
      },
      linkedQuestions,
      availableQuestions,
      subjects: allSubjects.map((s) => ({
        id: s.id,
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
      })),
      chapters: allChapters.map((c) => ({
        id: c.id,
        chapterName: c.chapterName,
        subjectId: c.subjectId,
      })),
      metrics,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'TEST_SERIES', 'UPDATE_QUESTIONS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const paperId = Number(id);
  const paper = getTestSeriesById(paperId);

  if (!paper) {
    return NextResponse.json(
      { success: false, error: 'Test paper not found.' },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { questionIds, markingScheme, expectedVersion } = body;

  // Concurrency Conflict Check
  if (expectedVersion !== undefined && paper.version !== undefined && expectedVersion !== paper.version) {
    return NextResponse.json(
      {
        success: false,
        error: `Conflict: This test paper was modified (current version is v${paper.version}, expected v${expectedVersion}). Please reload and retry.`,
      },
      { status: 409 }
    );
  }

  if (!Array.isArray(questionIds)) {
    return NextResponse.json(
      { success: false, error: 'questionIds must be an array of numeric question IDs.' },
      { status: 400 }
    );
  }

  const cleanIds = questionIds.map((n: any) => Number(n)).filter((n) => !isNaN(n) && n > 0);

  // Validate that all questions exist in Question Master
  const allQuestions = readQuestionsFromDb();
  const validIdSet = new Set(allQuestions.map((q) => Number(q.id)));
  const invalidIds = cleanIds.filter((qid) => !validIdSet.has(qid));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot link non-existent question IDs: [${invalidIds.join(', ')}].`,
      },
      { status: 400 }
    );
  }

  if (paper.status === 'Published' && cleanIds.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Cannot save an empty question list on a Published test paper. Unpublish or add questions first.',
      },
      { status: 400 }
    );
  }

  const adminUser = `${auth.user.fullName} (${auth.user.email})`;
  const updateData: Partial<TestSeriesRecord> = {
    questionIds: cleanIds,
  };

  if (markingScheme && typeof markingScheme === 'object') {
    updateData.markingScheme = {
      positiveMarks: Number(markingScheme.positiveMarks) || 3,
      negativeMarks: Number(markingScheme.negativeMarks) ?? 1,
      sectionOverrides: markingScheme.sectionOverrides || {},
    };
  }

  const result = await updateTestSeries(paperId, updateData, adminUser);

  if (!result.success || !result.testSeries) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to update test series questions.' },
      { status: 400 }
    );
  }

  // Audit Logging
  try {
    AuthDb.logAdminActivity({
      userId: auth.user.id,
      action: 'UPDATE_TEST_QUESTIONS',
      module: 'TEST_SERIES',
      entityId: String(paperId),
      details: JSON.stringify({
        totalQuestions: cleanIds.length,
        version: result.testSeries.version,
        markingScheme: result.testSeries.markingScheme,
      }),
    });
  } catch (logErr) {
    console.error('[AdminActivityLog] Failed to log:', logErr);
  }

  const metrics = calculateTestPaperMetrics(cleanIds, result.testSeries.markingScheme);

  return NextResponse.json({
    success: true,
    data: {
      testSeries: result.testSeries,
      metrics,
    },
  });
}

// Support POST as well for environments or clients that send POST
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}
