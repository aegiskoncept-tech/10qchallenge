import fs from 'fs';
import path from 'path';
import { readQuestionsFromDb, QuestionRecord } from './questions';
import { readSubjectsFromDb } from './subjects';
import { readChaptersFromDb } from './chapters';

export interface MarkingSchemeConfig {
  positiveMarks: number;
  negativeMarks: number;
  sectionOverrides?: Record<string, { positiveMarks: number; negativeMarks: number }>;
}

export interface TestPaperVersionSnapshot {
  version: number;
  publishedAt: string;
  title: string;
  examTag: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  questionIds: number[];
  markingScheme?: MarkingSchemeConfig;
  questionSnapshots?: Record<string, any>;
}

export interface TestSeriesRecord {
  id: number;
  title: string;
  examTag: string; // 'BITSAT' | 'JEE Main' | 'COMEDK' | 'MET' | 'VITEEE'
  targetYear: number;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  price: number;
  status: 'Published' | 'Draft' | 'Archived';
  version: number;
  questionIds?: number[];
  markingScheme?: MarkingSchemeConfig;
  versions?: TestPaperVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SanitizedQuestion {
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
  difficulty: string;
  orderNumber?: number;
}

export const CANONICAL_DEFAULT_TEST_SERIES: TestSeriesRecord[] = [
  {
    id: 1,
    title: 'BITSAT 2026 Full Syllabus CBT Mock 01',
    examTag: 'BITSAT',
    targetYear: 2026,
    description: 'Exact BITSAT pattern test with 130 questions (+12 bonus questions) and instant percentile report.',
    durationMinutes: 180,
    totalQuestions: 5,
    totalMarks: 15,
    price: 499,
    status: 'Published',
    version: 1,
    questionIds: [1, 2, 3, 4, 5],
    markingScheme: { positiveMarks: 3, negativeMarks: 1 },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 2,
    title: 'BITSAT 2026 Full Syllabus CBT Mock 02',
    examTag: 'BITSAT',
    targetYear: 2026,
    description: 'Advanced speed test focusing on Physics & Math time-allocation under high stress.',
    durationMinutes: 180,
    totalQuestions: 5,
    totalMarks: 15,
    price: 499,
    status: 'Published',
    version: 1,
    questionIds: [1, 2, 3, 4, 5],
    markingScheme: { positiveMarks: 3, negativeMarks: 1 },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 3,
    title: 'JEE Main 2026 Full Length Predictive Mock 01',
    examTag: 'JEE Main',
    targetYear: 2026,
    description: 'Curated by top IITians matching the latest NTA question distribution and numerical range.',
    durationMinutes: 180,
    totalQuestions: 5,
    totalMarks: 20,
    price: 399,
    status: 'Published',
    version: 1,
    questionIds: [1, 2, 3, 4, 5],
    markingScheme: { positiveMarks: 4, negativeMarks: 1 },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 4,
    title: 'COMEDK 2026 High Speed CBT Mock',
    examTag: 'COMEDK',
    targetYear: 2026,
    description: '180 questions in 180 minutes simulation for Bengaluru top engineering colleges.',
    durationMinutes: 180,
    totalQuestions: 5,
    totalMarks: 15,
    price: 349,
    status: 'Published',
    version: 1,
    questionIds: [1, 2, 3, 4, 5],
    markingScheme: { positiveMarks: 3, negativeMarks: 1 },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
];

// In-process AsyncMutex to serialize write operations
class TestSeriesAsyncMutex {
  private queue: Promise<any> = Promise.resolve();

  async run<T>(task: () => Promise<T> | T): Promise<T> {
    const res = this.queue.then(async () => {
      return await task();
    });
    this.queue = res.catch(() => {});
    return res;
  }
}

export const testSeriesMutex = new TestSeriesAsyncMutex();

// Advisory cross-process file lock with timeout and stale recovery
async function acquireTestSeriesFileLock(lockName = 'test-series', timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getTestSeriesDataPaths();
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
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
      try { fs.unlinkSync(lockFile); } catch {}
    }
  };
}

function getTestSeriesDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'test-series.json'), path.join(persistentDir, 'test-series.json')] : []),
    path.join(cwd, 'data', 'test-series.json'),
    path.join(cwd, 'frontend', 'data', 'test-series.json'),
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
    const fallback = path.join(cwd, 'data', 'test-series.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

// Read student attempts safely to check dependencies without circular imports
function getAttemptsForSafetyCheck(): Array<{ id: string; paperId: number }> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'test-attempts.json'),
    path.join(cwd, 'frontend', 'data', 'test-attempts.json'),
    path.join(cwd, '..', 'data', 'test-attempts.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
  }
  return [];
}

export function readTestSeriesFromDb(): TestSeriesRecord[] {
  const paths = getTestSeriesDataPaths();
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((t) => ({
              ...t,
              version: t.version || 1,
            }));
          }
        }
      }
    } catch (err) {}
  }
  writeTestSeriesToDb(CANONICAL_DEFAULT_TEST_SERIES);
  return CANONICAL_DEFAULT_TEST_SERIES;
}

export function writeTestSeriesToDb(tests: TestSeriesRecord[]): void {
  const json = JSON.stringify(tests, null, 2);
  const paths = getTestSeriesDataPaths();
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

export function getAdminTestSeries(search?: string, exam?: string): TestSeriesRecord[] {
  let list = readTestSeriesFromDb();
  if (exam && exam !== 'ALL') {
    list = list.filter((t) => t.examTag.toLowerCase() === exam.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.examTag.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => b.id - a.id);
}

export function getTestSeriesById(id: number): TestSeriesRecord | null {
  const all = readTestSeriesFromDb();
  return all.find((t) => Number(t.id) === Number(id)) || null;
}

export interface TestPaperVersionInfo {
  version: number;
  questionIds: number[];
  markingScheme: MarkingSchemeConfig;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  isArchived: boolean;
  questionSnapshots?: Record<string, any>;
}

function getCompatibilitySnapshotDataPaths(): string[] {
  const root = process.cwd();
  return [
    path.resolve(root, 'data', 'compatibility-snapshots.json'),
    path.resolve(root, 'frontend', 'data', 'compatibility-snapshots.json'),
  ];
}

export function getCompatibilitySnapshot(
  paperId: number,
  version: number
): Record<string, any> | null {
  const paths = getCompatibilitySnapshotDataPaths();
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        const key = `${paperId}_v${version}`;
        if (json[key]?.questionSnapshots) {
          return json[key].questionSnapshots;
        }
      } catch {}
    }
  }
  return null;
}

export function saveCompatibilitySnapshot(
  paperId: number,
  version: number,
  questionSnapshots: Record<string, any>
): void {
  const paths = getCompatibilitySnapshotDataPaths();
  const key = `${paperId}_v${version}`;
  for (const p of paths) {
    try {
      let data: Record<string, any> = {};
      if (fs.existsSync(p)) {
        try {
          data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch {}
      }
      data[key] = {
        paperId,
        paperVersion: version,
        createdAt: new Date().toISOString(),
        questionSnapshots,
      };
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  }
}

export function captureQuestionSnapshotsForPaper(
  questionIds: number[],
  markingScheme?: MarkingSchemeConfig,
  examTag = 'BITSAT'
): Record<string, any> {
  const snapshots: Record<string, any> = {};
  if (!Array.isArray(questionIds) || questionIds.length === 0) return snapshots;

  const allQ = readQuestionsFromDb();
  const allS = readSubjectsFromDb();
  const allC = readChaptersFromDb();
  const sMap = new Map(allS.map((s) => [Number(s.id), s.subjectName]));
  const cMap = new Map(allC.map((c) => [Number(c.id), c.chapterName]));
  const qMap = new Map(allQ.map((q) => [Number(q.id), q]));

  const isBitsat = examTag.toLowerCase().includes('bitsat');
  const posMarks = markingScheme?.positiveMarks ?? (isBitsat ? 3 : 4);
  const negMarks = markingScheme?.negativeMarks ?? 1;

  questionIds.forEach((qid, idx) => {
    const q = qMap.get(Number(qid));
    if (q && q.isActive !== false) {
      snapshots[String(q.id)] = {
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

  return snapshots;
}

/**
 * Resolves a specific version of a test paper.
 * For legacy attempts (where version is not specified or 1), checks if an archived snapshot
 * exists or if an immutable compatibility snapshot store contains it.
 */
export function getTestPaperVersion(id: number, version?: number): TestPaperVersionInfo | null {
  const paper = getTestSeriesById(id);
  if (!paper) return null;

  const targetVersion = typeof version === 'number' && version > 0 ? version : (paper.version || 1);
  const compatibility = getCompatibilitySnapshot(id, targetVersion) || undefined;

  // If target matches current paper version
  if ((paper.version || 1) === targetVersion) {
    return {
      version: paper.version || 1,
      questionIds: Array.isArray(paper.questionIds) ? [...paper.questionIds] : [],
      markingScheme: paper.markingScheme || {
        positiveMarks: paper.examTag?.toLowerCase().includes('bitsat') ? 3 : 4,
        negativeMarks: 1,
      },
      durationMinutes: paper.durationMinutes || 180,
      totalQuestions: paper.totalQuestions || 0,
      totalMarks: paper.totalMarks || 0,
      isArchived: false,
      questionSnapshots: compatibility,
    };
  }

  // Look up in archived versions array
  if (Array.isArray(paper.versions)) {
    const archived = paper.versions.find((v) => Number(v.version) === Number(targetVersion));
    if (archived) {
      return {
        version: archived.version,
        questionIds: Array.isArray(archived.questionIds) ? [...archived.questionIds] : [],
        markingScheme: archived.markingScheme || paper.markingScheme || {
          positiveMarks: paper.examTag?.toLowerCase().includes('bitsat') ? 3 : 4,
          negativeMarks: 1,
        },
        durationMinutes: archived.durationMinutes || paper.durationMinutes || 180,
        totalQuestions: archived.totalQuestions || 0,
        totalMarks: archived.totalMarks || 0,
        isArchived: true,
        questionSnapshots: archived.questionSnapshots || compatibility,
      };
    }
  }

  // Fallback to current paper if specific version not archived
  return {
    version: paper.version || 1,
    questionIds: Array.isArray(paper.questionIds) ? [...paper.questionIds] : [],
    markingScheme: paper.markingScheme || {
      positiveMarks: paper.examTag?.toLowerCase().includes('bitsat') ? 3 : 4,
      negativeMarks: 1,
    },
    durationMinutes: paper.durationMinutes || 180,
    totalQuestions: paper.totalQuestions || 0,
    totalMarks: paper.totalMarks || 0,
    isArchived: false,
    questionSnapshots: compatibility,
  };
}

/**
 * Server-side calculation of authoritative test metrics from linked questions.
 */
export function calculateTestPaperMetrics(
  questionIds: number[],
  markingScheme?: MarkingSchemeConfig
): {
  totalQuestions: number;
  totalMarks: number;
  subjectDistribution: Array<{ subjectId: number; subjectName: string; count: number; marks: number }>;
  chapterDistribution: Array<{ chapterId: number; chapterName: string; count: number }>;
} {
  const allQuestions = readQuestionsFromDb();
  const allSubjects = readSubjectsFromDb();
  const allChapters = readChaptersFromDb();

  const qMap = new Map<number, QuestionRecord>();
  allQuestions.forEach((q) => qMap.set(Number(q.id), q));

  const sMap = new Map<number, string>();
  allSubjects.forEach((s) => sMap.set(Number(s.id), s.subjectName));

  const cMap = new Map<number, string>();
  allChapters.forEach((c) => cMap.set(Number(c.id), c.chapterName));

  const defaultPos = markingScheme?.positiveMarks ?? 3;
  let totalMarks = 0;
  const subCountMap = new Map<number, { subjectId: number; subjectName: string; count: number; marks: number }>();
  const chapCountMap = new Map<number, { chapterId: number; chapterName: string; count: number }>();

  const validIds: number[] = [];
  for (const rawId of questionIds) {
    const q = qMap.get(Number(rawId));
    if (q && q.isActive !== false) {
      validIds.push(Number(rawId));
      const qMarks = defaultPos;
      totalMarks += qMarks;

      // Subject count
      const sId = Number(q.subjectId);
      const sName = sMap.get(sId) || `Subject #${sId}`;
      const subEntry = subCountMap.get(sId) || { subjectId: sId, subjectName: sName, count: 0, marks: 0 };
      subEntry.count++;
      subEntry.marks += qMarks;
      subCountMap.set(sId, subEntry);

      // Chapter count
      const chId = Number(q.chapterId);
      const chName = cMap.get(chId) || `Chapter #${chId}`;
      const chapEntry = chapCountMap.get(chId) || { chapterId: chId, chapterName: chName, count: 0 };
      chapEntry.count++;
      chapCountMap.set(chId, chapEntry);
    }
  }

  return {
    totalQuestions: validIds.length,
    totalMarks,
    subjectDistribution: Array.from(subCountMap.values()),
    chapterDistribution: Array.from(chapCountMap.values()),
  };
}

export async function createTestSeries(
  data: Partial<TestSeriesRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; testSeries?: TestSeriesRecord; error?: string }> {
  return testSeriesMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireTestSeriesFileLock('test-series');

      if (!data.title?.trim()) {
        return { success: false, error: 'Test title is required.' };
      }

      const durationMinutes = Number(data.durationMinutes);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        return { success: false, error: 'Test duration must be greater than 0 minutes.' };
      }

      // Deduplicate and sanitize questionIds
      let deduplicatedQuestionIds: number[] = [];
      if (Array.isArray(data.questionIds)) {
        deduplicatedQuestionIds = Array.from(new Set(data.questionIds.map(Number))).filter(
          (n) => !isNaN(n) && n > 0
        );
      }

      const status = data.status || 'Published';
      if (status === 'Published' && deduplicatedQuestionIds.length === 0) {
        return {
          success: false,
          error: 'Cannot publish a test paper with zero linked questions. Please link questions before publishing.',
        };
      }

      // Calculate authoritative metrics
      const metrics = calculateTestPaperMetrics(deduplicatedQuestionIds, data.markingScheme);

      const all = readTestSeriesFromDb();
      const newId = all.length > 0 ? Math.max(...all.map((t) => Number(t.id) || 0)) + 1 : 1;
      const now = new Date().toISOString();

      const newTest: TestSeriesRecord = {
        id: newId,
        title: data.title.trim(),
        examTag: data.examTag?.trim() || 'BITSAT',
        targetYear: Number(data.targetYear) || 2026,
        description: data.description?.trim() || '',
        durationMinutes,
        totalQuestions: deduplicatedQuestionIds.length > 0 ? metrics.totalQuestions : (Number(data.totalQuestions) || 0),
        totalMarks: deduplicatedQuestionIds.length > 0 ? metrics.totalMarks : (Number(data.totalMarks) || 0),
        price: Number(data.price) || 0,
        status,
        version: 1,
        questionIds: deduplicatedQuestionIds,
        markingScheme: data.markingScheme || {
          positiveMarks: data.examTag?.toLowerCase().includes('bitsat') ? 3 : 4,
          negativeMarks: 1,
        },
        versions: [],
        createdAt: now,
        updatedAt: now,
        createdBy: user,
      };

      all.push(newTest);
      writeTestSeriesToDb(all);
      return { success: true, testSeries: newTest };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create test series.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

export async function updateTestSeries(
  id: number,
  data: Partial<TestSeriesRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; testSeries?: TestSeriesRecord; error?: string }> {
  return testSeriesMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireTestSeriesFileLock('test-series');

      const all = readTestSeriesFromDb();
      const index = all.findIndex((t) => Number(t.id) === Number(id));
      if (index === -1) return { success: false, error: 'Test Series not found.' };

      const existing = all[index];

      // Validate title if provided
      if (data.title !== undefined && !data.title.trim()) {
        return { success: false, error: 'Test title cannot be empty.' };
      }

      // Deduplicate questionIds if provided
      let newQuestionIds: number[] | undefined = undefined;
      if (data.questionIds !== undefined) {
        if (!Array.isArray(data.questionIds)) {
          return { success: false, error: 'questionIds must be an array of numeric IDs.' };
        }
        newQuestionIds = Array.from(new Set(data.questionIds.map(Number))).filter(
          (n) => !isNaN(n) && n > 0
        );
      }

      const effectiveQuestionIds = newQuestionIds !== undefined ? newQuestionIds : (existing.questionIds || []);
      const newStatus = data.status || existing.status;

      if (newStatus === 'Published' && effectiveQuestionIds.length === 0) {
        return {
          success: false,
          error: 'Cannot publish a test paper with zero linked questions. Please link questions before publishing.',
        };
      }

      // Check if student attempts exist for this paper
      const attempts = getAttemptsForSafetyCheck();
      const linkedAttempts = attempts.filter((a) => Number(a.paperId) === Number(id));

      let effectiveVersion = existing.version || 1;
      let effectiveVersions = existing.versions || [];

      // If questionIds or markingScheme changed on a test that has existing attempts,
      // create an immutable historical version snapshot and increment paper version
      const questionIdsChanged =
        newQuestionIds !== undefined &&
        (newQuestionIds.length !== (existing.questionIds || []).length ||
          !newQuestionIds.every((qid, i) => qid === (existing.questionIds || [])[i]));

      const markingSchemeChanged =
        data.markingScheme !== undefined &&
        JSON.stringify(data.markingScheme) !== JSON.stringify(existing.markingScheme);

      if ((questionIdsChanged || markingSchemeChanged) && linkedAttempts.length > 0) {
        const snapshots = captureQuestionSnapshotsForPaper(
          existing.questionIds || [],
          existing.markingScheme,
          existing.examTag
        );
        const historicalSnapshot: TestPaperVersionSnapshot = {
          version: existing.version || 1,
          publishedAt: existing.updatedAt || existing.createdAt,
          title: existing.title,
          examTag: existing.examTag,
          durationMinutes: existing.durationMinutes,
          totalQuestions: existing.totalQuestions,
          totalMarks: existing.totalMarks,
          questionIds: [...(existing.questionIds || [])],
          markingScheme: existing.markingScheme,
          questionSnapshots: snapshots,
        };
        effectiveVersions = [...effectiveVersions, historicalSnapshot];
        effectiveVersion = (existing.version || 1) + 1;
        saveCompatibilitySnapshot(Number(id), existing.version || 1, snapshots);
      }

      // Recalculate metrics
      const effectiveMarking = data.markingScheme || existing.markingScheme;
      const metrics = calculateTestPaperMetrics(effectiveQuestionIds, effectiveMarking);

      const updated: TestSeriesRecord = {
        ...existing,
        ...data,
        id: existing.id,
        version: effectiveVersion,
        versions: effectiveVersions,
        questionIds: effectiveQuestionIds,
        totalQuestions: effectiveQuestionIds.length > 0 ? metrics.totalQuestions : (data.totalQuestions ?? existing.totalQuestions),
        totalMarks: effectiveQuestionIds.length > 0 ? metrics.totalMarks : (data.totalMarks ?? existing.totalMarks),
        updatedAt: new Date().toISOString(),
        updatedBy: user,
      };

      all[index] = updated;
      writeTestSeriesToDb(all);
      return { success: true, testSeries: updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update test series.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

export async function deleteTestSeries(id: number): Promise<{ success: boolean; error?: string }> {
  return testSeriesMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireTestSeriesFileLock('test-series');

      const all = readTestSeriesFromDb();
      const index = all.findIndex((t) => Number(t.id) === Number(id));
      if (index === -1) return { success: false, error: 'Test Series not found.' };

      // Protection: Check if any student attempts exist for this paper
      const attempts = getAttemptsForSafetyCheck();
      const linkedAttempts = attempts.filter((a) => Number(a.paperId) === Number(id));
      if (linkedAttempts.length > 0) {
        return {
          success: false,
          error: `Cannot delete Test Paper #${id}: It is referenced by ${linkedAttempts.length} student attempt(s). Please archive the test instead of deleting it.`,
        };
      }

      all.splice(index, 1);
      writeTestSeriesToDb(all);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete test series.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

/**
 * Retrieves sanitized question data for CBT delivery.
 * STRICT: If questionIds is empty, returns an empty collection. NEVER falls back to full question bank!
 */
export function getQuestionsForTestPaper(
  paperId: number,
  version?: number
): {
  success: boolean;
  questions?: SanitizedQuestion[];
  subjects?: Array<{ id: number; name: string; questionCount: number }>;
  paperVersion?: number;
  error?: string;
} {
  const paper = getTestSeriesById(paperId);
  if (!paper) {
    return { success: false, error: 'Test paper not found.' };
  }

  // Resolve specific paper version if requested (critical for legacy attempt preservation)
  const versionConfig = getTestPaperVersion(paperId, version);
  const targetQuestionIds = versionConfig?.questionIds ?? paper.questionIds ?? [];
  const effectiveVersion = versionConfig?.version ?? paper.version ?? 1;

  const allQuestions = readQuestionsFromDb();
  const allSubjects = readSubjectsFromDb();
  const allChapters = readChaptersFromDb();

  const subjectMap = new Map<number, string>();
  allSubjects.forEach((s) => subjectMap.set(Number(s.id), s.subjectName));

  const chapterMap = new Map<number, string>();
  allChapters.forEach((c) => chapterMap.set(Number(c.id), c.chapterName));

  let sanitizedQuestions: SanitizedQuestion[] = [];

  // If immutable question snapshots exist for this version, strictly use the snapshot!
  if (versionConfig?.questionSnapshots && Object.keys(versionConfig.questionSnapshots).length > 0) {
    const snapshots = Object.values(versionConfig.questionSnapshots);
    sanitizedQuestions = snapshots.map((s: any, idx: number) => {
      const sName = s.subjectName || subjectMap.get(Number(s.subjectId)) || `Subject #${s.subjectId}`;
      const chName = s.chapterName || chapterMap.get(Number(s.chapterId)) || `Chapter #${s.chapterId}`;

      const item: SanitizedQuestion = {
        id: s.id,
        questionNumber: idx + 1,
        questionType: s.questionType,
        subjectId: s.subjectId,
        subjectName: sName,
        chapterId: s.chapterId,
        chapterName: chName,
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
  } else {
    let assigned: QuestionRecord[] = [];
    if (targetQuestionIds.length > 0) {
      const questionMap = new Map(allQuestions.map((q) => [Number(q.id), q]));
      for (const qId of targetQuestionIds) {
        const q = questionMap.get(Number(qId));
        if (q && q.isActive !== false) {
          assigned.push(q);
        }
      }
    } else {
      // STRICT SECURITY FIX: Empty or missing questionIds returns empty array.
      // NEVER fall back to allQuestions!
      assigned = [];
    }

    if (assigned.length === 0) {
      return {
        success: true,
        questions: [],
        subjects: [],
        paperVersion: effectiveVersion,
      };
    }

    // Sanitize questions: STRICTLY STRIP correctOption, rangeFrom, rangeTo, tolerance, explanation, createdBy, updatedBy
    sanitizedQuestions = assigned.map((q, idx) => {
      const sName = subjectMap.get(Number(q.subjectId)) || `Subject #${q.subjectId}`;
      const chName = chapterMap.get(Number(q.chapterId)) || `Chapter #${q.chapterId}`;

      const item: SanitizedQuestion = {
        id: q.id,
        questionNumber: idx + 1,
        questionType: q.questionType,
        subjectId: q.subjectId,
        subjectName: sName,
        chapterId: q.chapterId,
        chapterName: chName,
        questionContent: q.questionContent,
        difficulty: q.difficulty,
        orderNumber: q.orderNumber,
      };

      if (q.questionType === 'objective') {
        item.optionA = q.optionA;
        item.optionB = q.optionB;
        item.optionC = q.optionC;
        item.optionD = q.optionD;
      }

      return item;
    });
  }

  // Calculate subject distribution for CBT navigation tabs
  const subjectCountMap = new Map<number, { id: number; name: string; questionCount: number }>();
  sanitizedQuestions.forEach((q) => {
    const existing = subjectCountMap.get(q.subjectId);
    if (existing) {
      existing.questionCount++;
    } else {
      subjectCountMap.set(q.subjectId, {
        id: q.subjectId,
        name: q.subjectName,
        questionCount: 1,
      });
    }
  });

  return {
    success: true,
    questions: sanitizedQuestions,
    subjects: Array.from(subjectCountMap.values()),
    paperVersion: effectiveVersion,
  };
}
