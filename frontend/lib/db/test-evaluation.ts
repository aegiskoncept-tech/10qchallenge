// ==============================================================================
// 10Q CHALLENGE LMS — TEST EVALUATION & SCORE CALCULATION ENGINE
// Purpose: Authoritative server-side evaluation of student test attempts
// ==============================================================================

import { QuestionRecord, getQuestionById, readQuestionsFromDb } from './questions';
import { TestAttemptRecord, StudentQuestionResponse, MarkingScheme } from './test-attempts';
import { getTestSeriesById, getTestPaperVersion } from './test-series';
import { readSubjectsFromDb } from './subjects';
import { readChaptersFromDb } from './chapters';

export type QuestionEvaluationStatus = 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';

export interface QuestionEvaluationDetail {
  questionId: number;
  questionType: 'objective' | 'numerical';
  studentResponse: {
    selectedOption?: string | null;
    numericalValue?: string | null;
    isMarkedForReview: boolean;
  };
  evaluationStatus: QuestionEvaluationStatus;
  marksAwarded: number;
}

export interface AttemptEvaluationResult {
  attemptId: string;
  studentId: number;
  paperId: number;
  paperTitle: string;
  examTag: string;
  submittedAt: string;
  submissionReason: 'MANUAL' | 'TIMEOUT';
  evaluationStatus: 'COMPLETED';
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  positiveMarks: number;
  negativeMarks: number;
  finalScore: number;
  maximumMarks: number;
  accuracy: number;
  evaluatedAt: string;
  evaluatorVersion: string;
  questionDetails?: QuestionEvaluationDetail[];
}

/**
 * Evaluates an objective (MCQ) question against the authoritative correct option.
 */
export function evaluateObjectiveQuestion(
  question: QuestionRecord,
  response: StudentQuestionResponse | undefined,
  markingScheme: MarkingScheme
): { status: QuestionEvaluationStatus; marksAwarded: number } {
  const selectedOpt = response?.selectedOption
    ? String(response.selectedOption).trim().toUpperCase()
    : null;

  // Unattempted: No option selected
  if (!selectedOpt) {
    return { status: 'UNATTEMPTED', marksAwarded: 0 };
  }

  const correctOpt = question.correctOption
    ? String(question.correctOption).trim().toUpperCase()
    : null;

  if (selectedOpt === correctOpt) {
    return {
      status: 'CORRECT',
      marksAwarded: markingScheme.positiveMarks,
    };
  }

  return {
    status: 'INCORRECT',
    marksAwarded: -markingScheme.negativeMarks,
  };
}

/**
 * Evaluates a numerical (NVT) question against authoritative range & tolerance.
 */
export function evaluateNumericalQuestion(
  question: QuestionRecord,
  response: StudentQuestionResponse | undefined,
  markingScheme: MarkingScheme
): { status: QuestionEvaluationStatus; marksAwarded: number } {
  const rawVal =
    response?.numericalValue !== null &&
    response?.numericalValue !== undefined &&
    String(response.numericalValue).trim() !== ''
      ? String(response.numericalValue).trim()
      : null;

  // Unattempted: Empty numerical input
  if (rawVal === null) {
    return { status: 'UNATTEMPTED', marksAwarded: 0 };
  }

  const numVal = Number(rawVal);
  if (isNaN(numVal) || !isFinite(numVal)) {
    return {
      status: 'INCORRECT',
      marksAwarded: -markingScheme.negativeMarks,
    };
  }

  const rangeFrom =
    question.rangeFrom !== undefined && question.rangeFrom !== null
      ? Number(question.rangeFrom)
      : NaN;

  if (isNaN(rangeFrom)) {
    return {
      status: 'INCORRECT',
      marksAwarded: -markingScheme.negativeMarks,
    };
  }

  const rangeTo =
    question.rangeTo !== undefined && question.rangeTo !== null
      ? Number(question.rangeTo)
      : rangeFrom;

  const tolerance =
    question.tolerance !== undefined && question.tolerance !== null
      ? Number(question.tolerance)
      : 0;

  const validTolerance = isNaN(tolerance) ? 0 : Math.abs(tolerance);
  const minBound = (isNaN(rangeFrom) ? 0 : rangeFrom) - validTolerance;
  const maxBound = (isNaN(rangeTo) ? rangeFrom : rangeTo) + validTolerance;

  const isWithinRange = numVal >= minBound - 1e-9 && numVal <= maxBound + 1e-9;

  if (isWithinRange) {
    return {
      status: 'CORRECT',
      marksAwarded: markingScheme.positiveMarks,
    };
  }

  return {
    status: 'INCORRECT',
    marksAwarded: -markingScheme.negativeMarks,
  };
}

/**
 * Evaluates all questions belonging to a test attempt and computes the score.
 */
export function evaluateTestAttempt(
  attempt: TestAttemptRecord,
  paperQuestions: QuestionRecord[],
  submissionReason: 'MANUAL' | 'TIMEOUT' = 'MANUAL'
): AttemptEvaluationResult {
  const markingScheme: MarkingScheme = attempt.markingScheme || {
    positiveMarks: attempt.examTag.toLowerCase().includes('bitsat') ? 3 : 4,
    negativeMarks: 1,
  };

  const questionDetails: QuestionEvaluationDetail[] = [];
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  let totalPositiveMarks = 0;
  let totalNegativeMarks = 0;
  let totalMaxMarks = 0;

  const responses = attempt.responses || {};
  const sectionOverrides = (attempt.markingScheme as any)?.sectionOverrides;

  for (const q of paperQuestions) {
    const resp = responses[String(q.id)];
    let evalStatus: QuestionEvaluationStatus = 'UNATTEMPTED';
    let marksAwarded = 0;

    let activeMarking = markingScheme;
    if (sectionOverrides && typeof sectionOverrides === 'object') {
      const sKey = String(q.subjectId);
      if (sectionOverrides[sKey]) {
        activeMarking = {
          positiveMarks: Number(sectionOverrides[sKey].positiveMarks) || markingScheme.positiveMarks,
          negativeMarks: Number(sectionOverrides[sKey].negativeMarks) ?? markingScheme.negativeMarks,
        };
      }
    }

    totalMaxMarks += activeMarking.positiveMarks;

    if (q.questionType === 'numerical') {
      const result = evaluateNumericalQuestion(q, resp, activeMarking);
      evalStatus = result.status;
      marksAwarded = result.marksAwarded;
    } else {
      const result = evaluateObjectiveQuestion(q, resp, activeMarking);
      evalStatus = result.status;
      marksAwarded = result.marksAwarded;
    }

    if (evalStatus === 'CORRECT') {
      correctCount++;
      totalPositiveMarks += marksAwarded;
    } else if (evalStatus === 'INCORRECT') {
      incorrectCount++;
      totalNegativeMarks += Math.abs(marksAwarded);
    } else {
      unattemptedCount++;
    }

    questionDetails.push({
      questionId: q.id,
      questionType: q.questionType,
      studentResponse: {
        selectedOption: resp?.selectedOption || null,
        numericalValue: resp?.numericalValue || null,
        isMarkedForReview: Boolean(resp?.isMarkedForReview),
      },
      evaluationStatus: evalStatus,
      marksAwarded,
    });
  }

  const totalQuestions = paperQuestions.length;
  const attemptedQuestions = correctCount + incorrectCount;
  const finalScore = totalPositiveMarks - totalNegativeMarks;
  const maximumMarks = totalMaxMarks > 0 ? totalMaxMarks : (totalQuestions * markingScheme.positiveMarks);

  const accuracy =
    attemptedQuestions > 0
      ? Number(((correctCount / attemptedQuestions) * 100).toFixed(2))
      : 0;

  const nowIso = new Date().toISOString();

  return {
    attemptId: attempt.id,
    studentId: attempt.studentId,
    paperId: attempt.paperId,
    paperTitle: attempt.paperTitle,
    examTag: attempt.examTag,
    submittedAt: nowIso,
    submissionReason,
    evaluationStatus: 'COMPLETED',
    totalQuestions,
    attemptedQuestions,
    correctQuestions: correctCount,
    incorrectQuestions: incorrectCount,
    unattemptedQuestions: unattemptedCount,
    positiveMarks: totalPositiveMarks,
    negativeMarks: totalNegativeMarks,
    finalScore,
    maximumMarks,
    accuracy,
    evaluatedAt: nowIso,
    evaluatorVersion: '1.0.0',
    questionDetails,
  };
}

export interface SubjectPerformanceBreakdown {
  subjectId: number;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  marksObtained: number;
  maximumMarks: number;
  accuracy: number;
}

export interface ChapterPerformanceBreakdown {
  chapterId: number;
  chapterName: string;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  marksObtained: number;
  accuracy: number;
}

export interface StudentQuestionReviewSummary {
  questionNumber: number;
  questionId: number;
  questionType: 'objective' | 'numerical';
  subjectName: string;
  chapterName: string;
  studentSelectedOption?: string | null;
  studentNumericalValue?: string | null;
  isMarkedForReview: boolean;
  evaluationStatus: QuestionEvaluationStatus;
  marksAwarded: number;
}

export interface AttemptScorecardDTO {
  attemptId: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  targetYear: number;
  startedAt: string;
  submittedAt: string;
  submissionReason: 'MANUAL' | 'TIMEOUT';
  evaluationStatus: 'COMPLETED';
  timeAllocatedMinutes: number;
  timeTakenSeconds: number | null;
  formattedTimeTaken: string;

  // Primary Scorecard Metrics (Exact persisted Feature 2.5 values)
  finalScore: number;
  maximumMarks: number;
  percentageScore: number;
  accuracy: number;

  // Performance Breakdown
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  markedForReviewCount: number;
  answeredAndMarkedCount: number;
  unansweredMarkedCount: number;
  positiveMarks: number;
  negativeMarks: number;

  // Sectional Breakdowns
  subjectBreakdown: SubjectPerformanceBreakdown[];
  chapterBreakdown: ChapterPerformanceBreakdown[];

  // Solution / Answer Review Policy
  answerReleasePolicy: {
    isAvailable: boolean;
    message: string;
  };

  // Question Review List (Sanitized: strictly NO answer keys, solutions, or tolerances)
  questionsReview: StudentQuestionReviewSummary[];
}

/**
 * Builds the comprehensive authoritative examination scorecard for a completed attempt.
 * Aggregates subject-wise and chapter-wise metrics directly on the server without client-side derivation.
 */
export function buildAttemptScorecard(attempt: TestAttemptRecord): AttemptScorecardDTO | null {
  if (attempt.status !== 'COMPLETED' || !attempt.result) {
    return null;
  }

  const result = attempt.result;
  const paper = getTestSeriesById(attempt.paperId);

  // Load questions for the paper (Strictly prefer immutable attempt snapshot)
  let paperQuestions: QuestionRecord[] = [];
  if (attempt.questionSnapshots && Object.keys(attempt.questionSnapshots).length > 0) {
    paperQuestions = Object.values(attempt.questionSnapshots).map((s) => ({
      id: s.id,
      questionType: s.questionType,
      subjectId: s.subjectId,
      chapterId: s.chapterId,
      questionContent: s.questionContent,
      optionA: s.optionA,
      optionB: s.optionB,
      optionC: s.optionC,
      optionD: s.optionD,
      correctOption: s.correctOption as any,
      rangeFrom: s.rangeFrom,
      rangeTo: s.rangeTo,
      tolerance: s.tolerance,
      explanation: s.explanation,
      difficulty: s.difficulty as any,
      orderNumber: s.orderNumber,
      isActive: true,
      createdAt: attempt.createdAt,
      updatedAt: attempt.createdAt,
    }));
  } else if (
    attempt.result?.questionDetails &&
    Array.isArray(attempt.result.questionDetails) &&
    attempt.result.questionDetails.length > 0
  ) {
    // For completed legacy attempts: questionDetails preserves the EXACT questions evaluated!
    const evaluatedIds = attempt.result.questionDetails.map((d) => d.questionId);
    paperQuestions = evaluatedIds
      .map((id) => getQuestionById(id))
      .filter(Boolean) as QuestionRecord[];
  } else {
    // Fallback for legacy attempts: retrieve questions from the attempt's paper version
    const targetVersion = attempt.paperVersion || 1;
    const versionConfig = getTestPaperVersion(attempt.paperId, targetVersion);

    if (versionConfig?.questionSnapshots && Object.keys(versionConfig.questionSnapshots).length > 0) {
      paperQuestions = Object.values(versionConfig.questionSnapshots).map((s: any) => ({
        id: s.id,
        questionType: s.questionType,
        subjectId: s.subjectId,
        chapterId: s.chapterId,
        questionContent: s.questionContent,
        optionA: s.optionA,
        optionB: s.optionB,
        optionC: s.optionC,
        optionD: s.optionD,
        correctOption: s.correctOption as any,
        rangeFrom: s.rangeFrom,
        rangeTo: s.rangeTo,
        tolerance: s.tolerance,
        explanation: s.explanation,
        difficulty: s.difficulty as any,
        orderNumber: s.orderNumber,
        isActive: true,
        createdAt: attempt.createdAt,
        updatedAt: attempt.createdAt,
      }));
    } else {
      const versionQuestionIds = versionConfig?.questionIds || [];
      if (versionQuestionIds.length > 0) {
        paperQuestions = versionQuestionIds
          .map((id) => getQuestionById(id))
          .filter(Boolean) as QuestionRecord[];
      }
    }
  }

  // Load subjects and chapters for naming and hierarchy
  const allSubjects = readSubjectsFromDb();
  const allChapters = readChaptersFromDb();

  const subjectMap = new Map<number, string>();
  allSubjects.forEach((s) => subjectMap.set(Number(s.id), s.subjectName));

  const chapterMap = new Map<number, { name: string; subjectId: number }>();
  allChapters.forEach((ch) => chapterMap.set(Number(ch.id), { name: ch.chapterName, subjectId: Number(ch.subjectId) }));

  // Create question evaluation detail map
  const evalDetailsMap = new Map<number, QuestionEvaluationDetail>();
  if (result.questionDetails && Array.isArray(result.questionDetails)) {
    result.questionDetails.forEach((d) => evalDetailsMap.set(d.questionId, d));
  } else {
    // Fallback derivation if questionDetails was not stored
    const responses = attempt.responses || {};
    const markingScheme = attempt.markingScheme || {
      positiveMarks: attempt.examTag.toLowerCase().includes('bitsat') ? 3 : 4,
      negativeMarks: 1,
    };
    for (const q of paperQuestions) {
      const resp = responses[String(q.id)];
      const res = q.questionType === 'numerical'
        ? evaluateNumericalQuestion(q, resp, markingScheme)
        : evaluateObjectiveQuestion(q, resp, markingScheme);
      evalDetailsMap.set(q.id, {
        questionId: q.id,
        questionType: q.questionType,
        studentResponse: {
          selectedOption: resp?.selectedOption || null,
          numericalValue: resp?.numericalValue || null,
          isMarkedForReview: Boolean(resp?.isMarkedForReview),
        },
        evaluationStatus: res.status,
        marksAwarded: res.marksAwarded,
      });
    }
  }

  // Calculate review counts from attempt.responses
  let markedForReviewCount = 0;
  let answeredAndMarkedCount = 0;
  let unansweredMarkedCount = 0;

  const responses = attempt.responses || {};
  Object.values(responses).forEach((resp) => {
    if (resp.isMarkedForReview) {
      markedForReviewCount++;
      const hasAnswer =
        (resp.selectedOption !== null && resp.selectedOption !== undefined) ||
        (resp.numericalValue !== null && resp.numericalValue !== undefined && String(resp.numericalValue).trim() !== '');
      if (hasAnswer) {
        answeredAndMarkedCount++;
      } else {
        unansweredMarkedCount++;
      }
    }
  });

  // Calculate reliable time taken
  let timeTakenSeconds: number | null = null;
  let formattedTimeTaken = 'N/A';

  const startTimeIso = attempt.startedAt;
  const submitTimeIso = attempt.submittedAt || result.submittedAt;

  if (startTimeIso && submitTimeIso) {
    const startMs = new Date(startTimeIso).getTime();
    const submitMs = new Date(submitTimeIso).getTime();
    if (!isNaN(startMs) && !isNaN(submitMs) && submitMs >= startMs) {
      const rawSeconds = Math.max(0, Math.floor((submitMs - startMs) / 1000));
      const maxAllocatedSeconds = (attempt.durationMinutes || 180) * 60;
      timeTakenSeconds = Math.min(rawSeconds, maxAllocatedSeconds);

      const hours = Math.floor(timeTakenSeconds / 3600);
      const minutes = Math.floor((timeTakenSeconds % 3600) / 60);
      const seconds = timeTakenSeconds % 60;

      if (hours > 0) {
        formattedTimeTaken = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        formattedTimeTaken = `${minutes}m ${seconds}s`;
      } else {
        formattedTimeTaken = `${seconds}s`;
      }
    }
  }

  // Build Subject Performance Breakdown
  const subjectAgg = new Map<
    number,
    {
      subjectId: number;
      subjectName: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      marks: number;
    }
  >();

  // Build Chapter Performance Breakdown
  const chapterAgg = new Map<
    number,
    {
      chapterId: number;
      chapterName: string;
      subjectName: string;
      total: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      marks: number;
    }
  >();

  // Build Questions Review List (strictly sanitized)
  const questionsReview: StudentQuestionReviewSummary[] = [];

  paperQuestions.forEach((q, idx) => {
    const sId = Number(q.subjectId);
    const sName = subjectMap.get(sId) || `Subject #${sId}`;

    const chId = Number(q.chapterId);
    const chInfo = chapterMap.get(chId);
    const chName = chInfo?.name || `Chapter #${chId}`;

    const evalDetail = evalDetailsMap.get(q.id);
    const status: QuestionEvaluationStatus = evalDetail?.evaluationStatus || 'UNATTEMPTED';
    const marks = evalDetail?.marksAwarded || 0;

    // Aggregate by Subject
    if (!subjectAgg.has(sId)) {
      subjectAgg.set(sId, {
        subjectId: sId,
        subjectName: sName,
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        marks: 0,
      });
    }
    const sEntry = subjectAgg.get(sId)!;
    sEntry.total++;
    sEntry.marks += marks;
    if (status === 'CORRECT') {
      sEntry.correct++;
      sEntry.attempted++;
    } else if (status === 'INCORRECT') {
      sEntry.incorrect++;
      sEntry.attempted++;
    } else {
      sEntry.unattempted++;
    }

    // Aggregate by Chapter
    if (!chapterAgg.has(chId)) {
      chapterAgg.set(chId, {
        chapterId: chId,
        chapterName: chName,
        subjectName: sName,
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        marks: 0,
      });
    }
    const chEntry = chapterAgg.get(chId)!;
    chEntry.total++;
    chEntry.marks += marks;
    if (status === 'CORRECT') {
      chEntry.correct++;
      chEntry.attempted++;
    } else if (status === 'INCORRECT') {
      chEntry.incorrect++;
      chEntry.attempted++;
    } else {
      chEntry.unattempted++;
    }

    // Question review entry (Sanitized: NO correctOption, NO explanation, NO tolerances)
    questionsReview.push({
      questionNumber: idx + 1,
      questionId: q.id,
      questionType: q.questionType,
      subjectName: sName,
      chapterName: chName,
      studentSelectedOption: evalDetail?.studentResponse?.selectedOption || null,
      studentNumericalValue: evalDetail?.studentResponse?.numericalValue || null,
      isMarkedForReview: Boolean(evalDetail?.studentResponse?.isMarkedForReview),
      evaluationStatus: status,
      marksAwarded: marks,
    });
  });

  const positiveMarksScheme = attempt.markingScheme?.positiveMarks || 3;

  const subjectBreakdown: SubjectPerformanceBreakdown[] = Array.from(subjectAgg.values()).map((s) => {
    const acc = s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(2)) : 0;
    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      totalQuestions: s.total,
      attemptedQuestions: s.attempted,
      correctQuestions: s.correct,
      incorrectQuestions: s.incorrect,
      unattemptedQuestions: s.unattempted,
      marksObtained: s.marks,
      maximumMarks: s.total * positiveMarksScheme,
      accuracy: acc,
    };
  });

  const chapterBreakdown: ChapterPerformanceBreakdown[] = Array.from(chapterAgg.values()).map((ch) => {
    const acc = ch.attempted > 0 ? Number(((ch.correct / ch.attempted) * 100).toFixed(2)) : 0;
    return {
      chapterId: ch.chapterId,
      chapterName: ch.chapterName,
      subjectName: ch.subjectName,
      totalQuestions: ch.total,
      attemptedQuestions: ch.attempted,
      correctQuestions: ch.correct,
      incorrectQuestions: ch.incorrect,
      unattemptedQuestions: ch.unattempted,
      marksObtained: ch.marks,
      accuracy: acc,
    };
  });

  const percentageScore =
    result.maximumMarks > 0
      ? Number(((result.finalScore / result.maximumMarks) * 100).toFixed(2))
      : 0;

  return {
    attemptId: attempt.id,
    paperId: attempt.paperId,
    paperTitle: attempt.paperTitle,
    examTag: attempt.examTag,
    targetYear: attempt.targetYear,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt || result.submittedAt,
    submissionReason: attempt.submissionReason || result.submissionReason || 'MANUAL',
    evaluationStatus: 'COMPLETED',
    timeAllocatedMinutes: attempt.durationMinutes,
    timeTakenSeconds,
    formattedTimeTaken,

    // Primary Scorecard Metrics (Exact persisted Feature 2.5 values)
    finalScore: result.finalScore,
    maximumMarks: result.maximumMarks,
    percentageScore,
    accuracy: result.accuracy,

    // Performance Breakdown
    totalQuestions: result.totalQuestions,
    attemptedQuestions: result.attemptedQuestions,
    correctQuestions: result.correctQuestions,
    incorrectQuestions: result.incorrectQuestions,
    unattemptedQuestions: result.unattemptedQuestions,
    markedForReviewCount,
    answeredAndMarkedCount,
    unansweredMarkedCount,
    positiveMarks: result.positiveMarks,
    negativeMarks: result.negativeMarks,

    // Sectional Breakdowns
    subjectBreakdown,
    chapterBreakdown,

    // Answer Review Policy
    answerReleasePolicy: {
      isAvailable: false,
      message: 'Answer keys and detailed explanations are not currently available for this test.',
    },

    // Sanitized Questions Review
    questionsReview,
  };
}
