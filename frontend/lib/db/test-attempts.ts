// ==============================================================================
// 10Q CHALLENGE LMS — SECURE TEST ATTEMPT DATA ACCESS LAYER
// Storage: File-backed JSON store in data/test-attempts.json
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { getTestSeriesById, getTestPaperVersion } from './test-series';
import { getQuestionById, QuestionRecord, readQuestionsFromDb } from './questions';
import { readSubjectsFromDb } from './subjects';
import { readChaptersFromDb } from './chapters';
import { evaluateTestAttempt, AttemptEvaluationResult } from './test-evaluation';

export interface MarkingScheme {
  positiveMarks: number;
  negativeMarks: number;
}

export interface QuestionSnapshot {
  id: number;
  questionNumber: number;
  questionType: 'objective' | 'numerical';
  subjectId: number;
  subjectName: string;
  chapterId: number;
  chapterName: string;
  questionContent: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  rangeFrom?: number | string;
  rangeTo?: number | string;
  tolerance?: number | string;
  explanation?: string;
  difficulty: string;
  orderNumber?: number;
  positiveMarks: number;
  negativeMarks: number;
}

export interface StudentQuestionResponse {
  questionId: number;
  questionType: 'objective' | 'numerical';
  selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
  numericalValue?: string | null;
  isMarkedForReview: boolean;
  version: number;
  firstAnsweredAt?: string;
  updatedAt: string;
}

export interface TestAttemptRecord {
  id: string; // Unique attempt ID e.g. att_1795024800000_3a8f
  studentId: number;
  studentName: string;
  studentEmail: string;
  paperId: number;
  paperTitle: string;
  paperVersion?: number; // Exactly records paper version used at attempt creation
  examTag: string;
  targetYear: number;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  markingScheme: MarkingScheme;
  startedAt: string; // ISO string generated strictly by server
  expiresAt: string; // ISO string = startedAt + durationMinutes
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  responses?: Record<string, StudentQuestionResponse>; // Keyed by string(questionId)
  visitedQuestionIds?: number[];
  questionSnapshots?: Record<string, QuestionSnapshot>; // Immutable snapshot of questions for this attempt
  submittedAt?: string;
  submissionReason?: 'MANUAL' | 'TIMEOUT';
  result?: AttemptEvaluationResult;
  createdAt: string;
  updatedAt: string;
}

// In-process AsyncMutex to serialize write operations
class AsyncMutex {
  private queue: Promise<any> = Promise.resolve();

  async run<T>(task: () => Promise<T> | T): Promise<T> {
    const res = this.queue.then(async () => {
      return await task();
    });
    this.queue = res.catch(() => {});
    return res;
  }
}

export const attemptMutex = new AsyncMutex();

// Advisory cross-process file lock with timeout and stale lock recovery
async function acquireAttemptFileLock(lockName = 'test-attempts', timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getTestAttemptsDataPaths();
  const primaryDir = path.dirname(paths[0]);
  const lockFile = path.join(primaryDir, `.${lockName}.lock`);
  const start = Date.now();
  let fd: number | null = null;

  while (Date.now() - start < timeoutMs) {
    try {
      fd = fs.openSync(lockFile, 'wx');
      fs.writeFileSync(fd, `${process.pid}\n${Date.now()}`, 'utf-8');
      break;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > 10000) {
            try { fs.unlinkSync(lockFile); } catch {}
            continue;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 20));
      } else {
        return async () => {};
      }
    }
  }

  return async () => {
    try {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
      if (fs.existsSync(lockFile)) {
        try { fs.unlinkSync(lockFile); } catch {}
      }
    } catch {}
  };
}

function getTestAttemptsDataPaths(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'test-attempts.json'),
    path.join(cwd, 'frontend', 'data', 'test-attempts.json'),
    path.join(cwd, '..', 'data', 'test-attempts.json'),
  ];
  const uniqueDirs = new Set<string>();
  const validPaths: string[] = [];
  for (const p of candidates) {
    const dir = path.dirname(p);
    if (!uniqueDirs.has(dir) && fs.existsSync(dir)) {
      uniqueDirs.add(dir);
      validPaths.push(p);
    }
  }
  if (validPaths.length === 0) {
    const fallback = path.join(cwd, 'data', 'test-attempts.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readTestAttemptsFromDb(): TestAttemptRecord[] {
  const paths = getTestAttemptsDataPaths();
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (err) {}
  }
  return [];
}

export function writeTestAttemptsToDb(attempts: TestAttemptRecord[]): void {
  const json = JSON.stringify(attempts, null, 2);
  const paths = getTestAttemptsDataPaths();
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tmpPath, json, 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {}
    }
  }
}

export function getAttemptById(attemptId: string): TestAttemptRecord | null {
  const attempts = readTestAttemptsFromDb();
  return attempts.find((a) => a.id === attemptId) || null;
}

export function getActiveAttemptForStudent(
  studentId: number,
  paperId: number
): TestAttemptRecord | null {
  const attempts = readTestAttemptsFromDb();
  const now = Date.now();
  // Find in-progress attempt for this student and paper that has not expired
  return (
    attempts.find((a) => {
      if (a.studentId !== studentId || a.paperId !== paperId) return false;
      if (a.status !== 'IN_PROGRESS') return false;
      const expiryTime = new Date(a.expiresAt).getTime();
      return expiryTime > now;
    }) || null
  );
}

export interface CreateAttemptInput {
  studentId: number;
  studentName: string;
  studentEmail: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  targetYear: number;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
}

export function createTestAttempt(input: CreateAttemptInput): {
  attempt: TestAttemptRecord;
  isExisting: boolean;
} {
  // 1. Idempotency Check: return active unexpired attempt if one exists
  const existing = getActiveAttemptForStudent(input.studentId, input.paperId);
  if (existing) {
    return { attempt: existing, isExisting: true };
  }

  // 2. Generate unique secure attempt ID
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  const attemptId = `att_${timestamp}_${randomSuffix}`;

  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const expiresAt = new Date(
    startedAtDate.getTime() + input.durationMinutes * 60 * 1000
  ).toISOString();

  // Load paper for version & question IDs
  const paper = getTestSeriesById(input.paperId);
  const paperVersion = paper?.version || 1;

  // Marking pattern based on exam / paper configuration
  const isBitsat = input.examTag.toLowerCase().includes('bitsat');
  const posMarks = paper?.markingScheme?.positiveMarks ?? (isBitsat ? 3 : 4);
  const negMarks = paper?.markingScheme?.negativeMarks ?? 1;
  const markingScheme: MarkingScheme = {
    positiveMarks: posMarks,
    negativeMarks: negMarks,
  };

  // Build immutable question snapshot for this attempt
  const questionSnapshots: Record<string, QuestionSnapshot> = {};
  if (paper?.questionIds && Array.isArray(paper.questionIds) && paper.questionIds.length > 0) {
    const allQ = readQuestionsFromDb();
    const allS = readSubjectsFromDb();
    const allC = readChaptersFromDb();
    const sMap = new Map(allS.map((s) => [Number(s.id), s.subjectName]));
    const cMap = new Map(allC.map((c) => [Number(c.id), c.chapterName]));
    const qMap = new Map(allQ.map((q) => [Number(q.id), q]));

    paper.questionIds.forEach((qid, idx) => {
      const q = qMap.get(Number(qid));
      if (q && q.isActive !== false) {
        questionSnapshots[String(q.id)] = {
          id: q.id,
          questionNumber: idx + 1,
          questionType: q.questionType,
          subjectId: q.subjectId,
          subjectName: sMap.get(Number(q.subjectId)) || `Subject #${q.subjectId}`,
          chapterId: q.chapterId,
          chapterName: cMap.get(Number(q.chapterId)) || `Chapter #${q.chapterId}`,
          questionContent: q.questionContent,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          rangeFrom: q.rangeFrom,
          rangeTo: q.rangeTo,
          tolerance: q.tolerance,
          explanation: q.explanation,
          difficulty: q.difficulty,
          orderNumber: q.orderNumber,
          positiveMarks: posMarks,
          negativeMarks: negMarks,
        };
      }
    });
  }

  const snapshotCount = Object.keys(questionSnapshots).length;

  const newAttempt: TestAttemptRecord = {
    id: attemptId,
    studentId: input.studentId,
    studentName: input.studentName,
    studentEmail: input.studentEmail,
    paperId: input.paperId,
    paperTitle: input.paperTitle,
    paperVersion,
    examTag: input.examTag,
    targetYear: input.targetYear,
    durationMinutes: input.durationMinutes,
    totalQuestions: snapshotCount > 0 ? snapshotCount : input.totalQuestions,
    totalMarks: snapshotCount > 0 ? snapshotCount * posMarks : input.totalMarks,
    markingScheme,
    startedAt,
    expiresAt,
    status: 'IN_PROGRESS',
    responses: {},
    visitedQuestionIds: [],
    questionSnapshots,
    createdAt: startedAt,
    updatedAt: startedAt,
  };

  const all = readTestAttemptsFromDb();
  all.push(newAttempt);
  writeTestAttemptsToDb(all);

  return { attempt: newAttempt, isExisting: false };
}

export interface SaveAnswerInput {
  attemptId: string;
  studentId: number;
  questionId: number;
  questionType: 'objective' | 'numerical';
  selectedOption?: string | null;
  numericalValue?: string | null;
  isMarkedForReview?: boolean;
  clientVersion?: number;
}

export async function saveStudentAnswer(
  input: SaveAnswerInput
): Promise<{
  success: boolean;
  response?: StudentQuestionResponse;
  attempt?: TestAttemptRecord;
  error?: string;
  status: number;
}> {
  return attemptMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireAttemptFileLock();

      const all = readTestAttemptsFromDb();
      const attemptIndex = all.findIndex((a) => a.id === input.attemptId);
      if (attemptIndex === -1) {
        return { success: false, error: 'Test attempt not found.', status: 404 };
      }

      const attempt = all[attemptIndex];

      // 1. Student Identity Isolation: Strict Ownership Guard
      if (attempt.studentId !== input.studentId) {
        return {
          success: false,
          error: 'Access forbidden: this test attempt belongs to another student.',
          status: 403,
        };
      }

      // 2. Attempt Status Guard
      if (attempt.status !== 'IN_PROGRESS') {
        return {
          success: false,
          error: `Cannot modify answers: test attempt is ${attempt.status.toLowerCase().replace('_', ' ')}.`,
          status: 403,
        };
      }

      // 3. Authoritative Server Expiry Guard
      const nowMs = Date.now();
      const expiryMs = new Date(attempt.expiresAt).getTime();
      if (nowMs >= expiryMs) {
        return {
          success: false,
          error: 'Test attempt has expired. Answers can no longer be saved.',
          status: 403,
        };
      }

      // 4. Verify Question Belongs to Test Paper or Attempt Question Snapshots
      const questionIdNum = Number(input.questionId);
      if (isNaN(questionIdNum) || questionIdNum <= 0) {
        return { success: false, error: 'Invalid question ID.', status: 400 };
      }

      let actualType: 'objective' | 'numerical' = 'objective';

      if (attempt.questionSnapshots && Object.keys(attempt.questionSnapshots).length > 0) {
        const snapshot = attempt.questionSnapshots[String(questionIdNum)];
        if (!snapshot) {
          return {
            success: false,
            error: `Question #${questionIdNum} does not belong to test attempt #${attempt.id}.`,
            status: 400,
          };
        }
        actualType = (snapshot.questionType as 'objective' | 'numerical') || 'objective';
      } else {
        // Fallback for legacy attempts: resolve authoritatively against attempt's paper version
        const targetVersion = attempt.paperVersion || 1;
        const versionConfig = getTestPaperVersion(attempt.paperId, targetVersion);
        if (!versionConfig) {
          return { success: false, error: 'Associated test paper not found.', status: 404 };
        }

        const validQuestionIds = versionConfig.questionIds || [];
        const isRecorded =
          (attempt.responses && attempt.responses[String(questionIdNum)]) ||
          (attempt.visitedQuestionIds && attempt.visitedQuestionIds.includes(questionIdNum));

        if (validQuestionIds.length > 0 && !validQuestionIds.includes(questionIdNum) && !isRecorded) {
          return {
            success: false,
            error: `Question #${questionIdNum} does not belong to test paper #${attempt.paperId} (v${targetVersion}).`,
            status: 400,
          };
        }

        // Verify Question Exists in Master Database & Validate Format
        const masterQuestion = getQuestionById(questionIdNum);
        if (!masterQuestion) {
          return {
            success: false,
            error: `Question #${questionIdNum} not found in question master bank.`,
            status: 404,
          };
        }
        actualType = masterQuestion.questionType;
      }
      let cleanOption: 'A' | 'B' | 'C' | 'D' | null = null;
      let cleanNumerical: string | null = null;

      if (actualType === 'objective') {
        if (input.selectedOption !== undefined && input.selectedOption !== null && input.selectedOption !== '') {
          const upperOpt = String(input.selectedOption).trim().toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(upperOpt)) {
            return {
              success: false,
              error: 'Invalid option for objective question. Must be A, B, C, or D.',
              status: 400,
            };
          }
          cleanOption = upperOpt as 'A' | 'B' | 'C' | 'D';
        }
      } else if (actualType === 'numerical') {
        if (input.numericalValue !== undefined && input.numericalValue !== null && input.numericalValue !== '') {
          const rawVal = String(input.numericalValue).trim();
          const parsed = Number(rawVal);
          if (isNaN(parsed) || !isFinite(parsed)) {
            return {
              success: false,
              error: 'Invalid numerical response. Must be a valid integer or decimal number.',
              status: 400,
            };
          }
          cleanNumerical = rawVal;
        }
      }

      // 6. Setup responses container & check for stale out-of-order updates
      attempt.responses = attempt.responses || {};
      const key = String(questionIdNum);
      const existing = attempt.responses[key];

      if (
        input.clientVersion !== undefined &&
        existing &&
        existing.version > input.clientVersion
      ) {
        // Stale update: a newer response is already recorded on server. Preserve newer response.
        return {
          success: true,
          response: existing,
          attempt,
          status: 200,
        };
      }

      const nextVersion = (existing?.version || 0) + 1;
      const nowIso = new Date().toISOString();
      const hasAnswer = cleanOption !== null || cleanNumerical !== null;
      const firstAnsweredAt = existing?.firstAnsweredAt || (hasAnswer ? nowIso : undefined);

      const isMarked =
        input.isMarkedForReview !== undefined
          ? Boolean(input.isMarkedForReview)
          : Boolean(existing?.isMarkedForReview);

      const responseRecord: StudentQuestionResponse = {
        questionId: questionIdNum,
        questionType: actualType,
        selectedOption: cleanOption,
        numericalValue: cleanNumerical,
        isMarkedForReview: isMarked,
        version: nextVersion,
        firstAnsweredAt,
        updatedAt: nowIso,
      };

      attempt.responses[key] = responseRecord;

      // Track visited
      attempt.visitedQuestionIds = attempt.visitedQuestionIds || [];
      if (!attempt.visitedQuestionIds.includes(questionIdNum)) {
        attempt.visitedQuestionIds.push(questionIdNum);
      }

      attempt.updatedAt = nowIso;
      all[attemptIndex] = attempt;

      // 7. Atomic Write to Disk
      writeTestAttemptsToDb(all);

      return {
        success: true,
        response: responseRecord,
        attempt,
        status: 200,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to save student answer.',
        status: 500,
      };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

export async function markQuestionVisited(
  attemptId: string,
  studentId: number,
  questionId: number
): Promise<void> {
  return attemptMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireAttemptFileLock();
      const all = readTestAttemptsFromDb();
      const attempt = all.find((a) => a.id === attemptId);
      if (!attempt || attempt.studentId !== studentId) return;

      attempt.visitedQuestionIds = attempt.visitedQuestionIds || [];
      if (!attempt.visitedQuestionIds.includes(questionId)) {
        attempt.visitedQuestionIds.push(questionId);
        attempt.updatedAt = new Date().toISOString();
        writeTestAttemptsToDb(all);
      }
    } catch (e) {
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

export interface SubmitAttemptInput {
  attemptId: string;
  studentId: number;
  submissionReason?: 'MANUAL' | 'TIMEOUT';
}

export async function submitTestAttempt(
  input: SubmitAttemptInput
): Promise<{
  success: boolean;
  result?: AttemptEvaluationResult;
  isExisting?: boolean;
  error?: string;
  status: number;
}> {
  return attemptMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireAttemptFileLock();

      const all = readTestAttemptsFromDb();
      const attemptIndex = all.findIndex((a) => a.id === input.attemptId);
      if (attemptIndex === -1) {
        return { success: false, error: 'Test attempt not found.', status: 404 };
      }

      const attempt = all[attemptIndex];

      // 1. Strict Ownership Enforcement
      if (attempt.studentId !== input.studentId) {
        return {
          success: false,
          error: 'Access forbidden: this test attempt belongs to another student.',
          status: 403,
        };
      }

      // 2. Idempotency Check: If already completed, return existing result without re-evaluating
      if (attempt.status === 'COMPLETED' && attempt.result) {
        return {
          success: true,
          result: attempt.result,
          isExisting: true,
          status: 200,
        };
      }

      // 3. Authoritative Expiry Check & Effective Submission Reason
      const nowMs = Date.now();
      const expiryMs = new Date(attempt.expiresAt).getTime();
      const isExpired = nowMs >= expiryMs;
      const effectiveReason: 'MANUAL' | 'TIMEOUT' = isExpired
        ? 'TIMEOUT'
        : input.submissionReason || 'MANUAL';

      // 4. Retrieve Questions for Paper (Strictly prefer immutable attempt snapshot)
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
      } else {
        // Fallback for legacy attempts created prior to snapshotting: resolve against attempt's paper version
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
          } else {
            // If version has no question IDs, check responses on attempt
            const respIds = Object.keys(attempt.responses || {})
              .map(Number)
              .filter((n) => !isNaN(n) && n > 0);
            if (respIds.length > 0) {
              paperQuestions = respIds.map((id) => getQuestionById(id)).filter(Boolean) as QuestionRecord[];
            }
          }
        }
      }

      // 5. Run Server-Side Authoritative Evaluation Engine
      const evaluationResult = evaluateTestAttempt(
        attempt,
        paperQuestions,
        effectiveReason
      );

      // 6. Finalize Attempt Record
      const nowIso = new Date().toISOString();
      attempt.status = 'COMPLETED';
      attempt.submittedAt = nowIso;
      attempt.submissionReason = effectiveReason;
      attempt.result = evaluationResult;
      attempt.updatedAt = nowIso;

      all[attemptIndex] = attempt;

      // 7. Atomic Write to Disk
      writeTestAttemptsToDb(all);

      return {
        success: true,
        result: evaluationResult,
        isExisting: false,
        status: 200,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to submit and evaluate test attempt.',
        status: 500,
      };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}
