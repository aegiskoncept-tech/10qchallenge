import fs from 'fs';
import path from 'path';
import { readCoursesFromDb } from './courses';
import { readSubjectsFromDb, isSubjectAssignedToCourse } from './subjects';
import { readChaptersFromDb } from './chapters';
import { readTopicsFromDb } from './topics';

export type QuestionType = 'objective' | 'numerical';
export type DifficultyLevel = 'Low' | 'Medium' | 'High';
export type CorrectOption = 'A' | 'B' | 'C' | 'D';

export interface QuestionRecord {
  id: number;
  questionType: QuestionType;
  courseId?: number;
  subjectId: number;
  chapterId: number;
  topicId?: number;
  examId?: number;
  questionContent: string;
  // Objective MCQ options
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: CorrectOption;
  // Numerical answer range
  rangeFrom?: number | string;
  rangeTo?: number | string;
  tolerance?: number | string;
  // Scoring configuration
  marks?: number;
  negativeMarks?: number;
  // Common metadata
  explanation?: string;
  difficulty: DifficultyLevel;
  orderNumber?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Canonical high-yield question bank for initial seeding
export const CANONICAL_DEFAULT_QUESTIONS: QuestionRecord[] = [
  {
    id: 1,
    questionType: 'objective',
    subjectId: 1, // Physics
    chapterId: 1, // Mechanics & Kinematics
    questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
    optionA: 't = 1 s',
    optionB: 't = 2 s',
    optionC: 't = 3 s',
    optionD: 't = 4 s',
    correctOption: 'B',
    explanation: 'Velocity v = dx/dt = d(3t² - 12t + 9)/dt = 6t - 12. Setting v = 0 gives 6t - 12 = 0 => t = 2 seconds.',
    difficulty: 'Medium',
    orderNumber: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 2,
    questionType: 'objective',
    subjectId: 1, // Physics
    chapterId: 2, // Rotational Motion & Gravitation
    questionContent: 'A solid uniform sphere of mass M and radius R rolls down an inclined plane of height h without slipping. What is the speed of its center of mass upon reaching the bottom?',
    optionA: '√(2gh)',
    optionB: '√(4gh/3)',
    optionC: '√(10gh/7)',
    optionD: '√(5gh/3)',
    correctOption: 'C',
    explanation: 'By conservation of mechanical energy: Mgh = ½Mv² + ½Iω². For a solid sphere, I = ⅖MR² and ω = v/R. Thus Mgh = ½Mv² + ⅕Mv² = ⁷/₁₀Mv² => v = √(10gh/7).',
    difficulty: 'Medium',
    orderNumber: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 3,
    questionType: 'objective',
    subjectId: 3, // Mathematics
    chapterId: 4, // Calculus: Limits, Continuity & Derivatives
    questionContent: 'Evaluate the limit: lim (x -> 0) [sin(5x) / x].',
    optionA: '0',
    optionB: '1',
    optionC: '5',
    optionD: 'Does not exist',
    correctOption: 'C',
    explanation: 'Standard trigonometric limit: lim (u -> 0) [sin(u)/u] = 1. Multiplying and dividing by 5 gives: lim (5 * sin(5x)/(5x)) = 5 * 1 = 5.',
    difficulty: 'Low',
    orderNumber: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 4,
    questionType: 'numerical',
    subjectId: 1, // Physics
    chapterId: 1, // Mechanics & Kinematics
    questionContent: 'A block of mass 2 kg rests on a frictionless horizontal plane. A constant horizontal force of 10 N is applied to it. Calculate the acceleration of the block in m/s².',
    rangeFrom: '5.00',
    rangeTo: '5.00',
    tolerance: '0.05',
    explanation: 'According to Newton\'s Second Law: a = F / m = 10 N / 2 kg = 5.00 m/s².',
    difficulty: 'Low',
    orderNumber: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 5,
    questionType: 'numerical',
    subjectId: 1, // Physics
    chapterId: 2, // Rotational Motion & Gravitation
    questionContent: 'A flywheel with a moment of inertia of 0.40 kg·m² is acted upon by a constant net torque of 2.0 N·m. Determine its angular acceleration in rad/s².',
    rangeFrom: '5.00',
    rangeTo: '5.00',
    tolerance: '0.05',
    explanation: 'Torque equation: τ = I * α => α = τ / I = 2.0 / 0.40 = 5.00 rad/s².',
    difficulty: 'Medium',
    orderNumber: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
];

// Helper to determine persistent storage file paths for questions
function getQuestionDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'questions.json'), path.join(persistentDir, 'questions.json')] : []),
    path.join(cwd, 'data', 'questions.json'),
    path.join(cwd, 'frontend', 'data', 'questions.json'),
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
    const fallback = path.join(cwd, 'data', 'questions.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }

  return validPaths;
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

export const questionMutex = new AsyncMutex();

// Advisory cross-process file lock with timeout and stale lock recovery
async function acquireFileLock(lockName: string, timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getQuestionDataPaths();
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

// Read questions from disk with multi-path fallback and dual-mirroring synchronization
export function readQuestionsFromDb(): QuestionRecord[] {
  const paths = getQuestionDataPaths();
  let candidateWithData: { path: string; data: QuestionRecord[] } | null = null;
  let emptyPaths: string[] = [];

  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            candidateWithData = { path: filePath, data: parsed };
            break;
          } else if (Array.isArray(parsed)) {
            emptyPaths.push(filePath);
          }
        }
      } else {
        emptyPaths.push(filePath);
      }
    } catch (err) {
      console.error(`[DB Error] Reading questions from ${filePath}:`, err);
    }
  }

  if (candidateWithData) {
    for (const emptyPath of emptyPaths) {
      try {
        const dir = path.dirname(emptyPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(emptyPath, JSON.stringify(candidateWithData.data, null, 2), 'utf-8');
      } catch {}
    }
    return candidateWithData.data;
  }

  // Safe initialize with canonical default questions
  writeQuestionsToDb(CANONICAL_DEFAULT_QUESTIONS);
  return CANONICAL_DEFAULT_QUESTIONS;
}

// Write questions atomically across all valid data paths
export function writeQuestionsToDb(questions: QuestionRecord[]): void {
  const json = JSON.stringify(questions, null, 2);
  const paths = getQuestionDataPaths();

  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tmpPath, json, 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      console.error(`[DB Error] Writing questions to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, innerErr);
      }
    }
  }
}

// HTML & script sanitization helper to prevent XSS while preserving formatting and math symbols
export function sanitizeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '');
}

// Query: Admin Questions with academic names, filtering, search, and pagination
export function getAdminQuestions(filters?: {
  questionType?: QuestionType;
  courseId?: number;
  subjectId?: number;
  chapterId?: number;
  topicId?: number;
  examId?: number;
  difficulty?: DifficultyLevel;
  search?: string;
  isActive?: boolean;
}): Array<
  QuestionRecord & {
    courseId?: number;
    courseTitle?: string;
    courseExam?: string;
    subjectName: string;
    subjectCode?: string;
    chapterName: string;
    chapterCode?: string;
    topicName?: string;
    topicCode?: string;
  }
> {
  const all = readQuestionsFromDb();
  const courses = readCoursesFromDb();
  const subjects = readSubjectsFromDb();
  const chapters = readChaptersFromDb();
  const topics = readTopicsFromDb();

  const courseMap = new Map<number, { title: string; exam?: string }>();
  courses.forEach((c) => courseMap.set(Number(c.id), { title: c.title, exam: c.exam }));

  const subjectMap = new Map<number, { name: string; code?: string }>();
  subjects.forEach((s) => subjectMap.set(Number(s.id), { name: s.subjectName, code: s.subjectCode }));

  const chapterMap = new Map<number, { name: string; code?: string; courseId?: number; subjectId?: number }>();
  chapters.forEach((ch) =>
    chapterMap.set(Number(ch.id), {
      name: ch.chapterName,
      code: ch.chapterCode,
      courseId: ch.courseId ? Number(ch.courseId) : undefined,
      subjectId: ch.subjectId ? Number(ch.subjectId) : undefined,
    })
  );

  const topicMap = new Map<number, { name: string; code?: string }>();
  topics.forEach((t) => topicMap.set(Number(t.id), { name: t.topicName, code: t.topicCode }));

  let filtered = all;

  if (filters?.questionType) {
    filtered = filtered.filter((q) => q.questionType === filters.questionType);
  }

  if (filters?.courseId) {
    const cId = Number(filters.courseId);
    filtered = filtered.filter((q) => {
      if (q.courseId) return Number(q.courseId) === cId;
      const ch = chapterMap.get(Number(q.chapterId));
      return ch && ch.courseId === cId;
    });
  }

  if (filters?.subjectId) {
    const sId = Number(filters.subjectId);
    filtered = filtered.filter((q) => Number(q.subjectId) === sId);
  }

  if (filters?.chapterId) {
    const chId = Number(filters.chapterId);
    filtered = filtered.filter((q) => Number(q.chapterId) === chId);
  }

  if (filters?.topicId) {
    const tId = Number(filters.topicId);
    filtered = filtered.filter((q) => Number(q.topicId) === tId);
  }

  if (filters?.difficulty) {
    filtered = filtered.filter((q) => q.difficulty.toLowerCase() === filters.difficulty?.toLowerCase());
  }

  if (filters?.isActive !== undefined) {
    filtered = filtered.filter((q) => q.isActive === filters.isActive);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      const chInfo = chapterMap.get(Number(item.chapterId));
      const effCourseId = item.courseId || chInfo?.courseId;
      const cInfo = effCourseId ? courseMap.get(effCourseId) : undefined;
      const sInfo = subjectMap.get(Number(item.subjectId));
      const tInfo = item.topicId ? topicMap.get(Number(item.topicId)) : undefined;

      return (
        String(item.id).includes(q) ||
        item.questionContent.toLowerCase().includes(q) ||
        (item.optionA && item.optionA.toLowerCase().includes(q)) ||
        (item.optionB && item.optionB.toLowerCase().includes(q)) ||
        (item.optionC && item.optionC.toLowerCase().includes(q)) ||
        (item.optionD && item.optionD.toLowerCase().includes(q)) ||
        (item.explanation && item.explanation.toLowerCase().includes(q)) ||
        (sInfo && sInfo.name.toLowerCase().includes(q)) ||
        (chInfo && chInfo.name.toLowerCase().includes(q)) ||
        (tInfo && tInfo.name.toLowerCase().includes(q)) ||
        (cInfo && cInfo.title.toLowerCase().includes(q))
      );
    });
  }

  return filtered
    .map((item) => {
      const chInfo = chapterMap.get(Number(item.chapterId));
      const effCourseId = item.courseId || chInfo?.courseId;
      const cInfo = effCourseId ? courseMap.get(effCourseId) : undefined;
      const sInfo = subjectMap.get(Number(item.subjectId));
      const tInfo = item.topicId ? topicMap.get(Number(item.topicId)) : undefined;

      return {
        ...item,
        courseId: effCourseId,
        courseTitle: cInfo ? cInfo.title : effCourseId ? `Course #${effCourseId}` : undefined,
        courseExam: cInfo?.exam,
        subjectName: sInfo ? sInfo.name : `Subject #${item.subjectId}`,
        subjectCode: sInfo?.code,
        chapterName: chInfo ? chInfo.name : `Chapter #${item.chapterId}`,
        chapterCode: chInfo?.code,
        topicName: tInfo ? tInfo.name : undefined,
        topicCode: tInfo?.code,
      };
    })
    .sort((a, b) => (Number(a.orderNumber) || a.id) - (Number(b.orderNumber) || b.id));
}

// Query: Get single question by ID
export function getQuestionById(id: number): QuestionRecord | null {
  const all = readQuestionsFromDb();
  const numId = Number(id);
  return all.find((q) => Number(q.id) === numId) || null;
}

// Create new question with full academic hierarchy validation & concurrency protection
export async function createQuestion(
  data: {
    questionType: QuestionType;
    courseId?: number;
    subjectId: number;
    chapterId: number;
    topicId?: number;
    examId?: number;
    questionContent: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctOption?: CorrectOption;
    rangeFrom?: number | string;
    rangeTo?: number | string;
    tolerance?: number | string;
    marks?: number;
    negativeMarks?: number;
    explanation?: string;
    difficulty?: DifficultyLevel;
    orderNumber?: number;
    isActive?: boolean;
  },
  user = 'Administrator'
): Promise<{ success: boolean; question?: QuestionRecord; error?: string }> {
  return questionMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('questions');

      const questionType = data.questionType;
      if (questionType !== 'objective' && questionType !== 'numerical') {
        return { success: false, error: 'Question Type must be either "objective" or "numerical".' };
      }

      const subjectId = Number(data.subjectId);
      const chapterId = Number(data.chapterId);
      const questionContent = String(data.questionContent || '').trim();

      if (!subjectId || isNaN(subjectId)) {
        return { success: false, error: 'Subject is required.' };
      }
      if (!chapterId || isNaN(chapterId)) {
        return { success: false, error: 'Chapter is required.' };
      }
      if (!questionContent) {
        return { success: false, error: 'Question Content is required.' };
      }

      // 1. Academic Hierarchy: Course validation (if provided)
      let targetCourseId = data.courseId !== undefined && data.courseId !== null ? Number(data.courseId) : undefined;
      let course: any = undefined;
      if (targetCourseId && !isNaN(targetCourseId)) {
        const courses = readCoursesFromDb();
        course = courses.find((c) => Number(c.id) === targetCourseId);
        if (!course) {
          return { success: false, error: `Course with ID ${targetCourseId} does not exist.` };
        }
      }

      // 2. Verify that Subject exists
      const subjects = readSubjectsFromDb();
      const subject = subjects.find((s) => Number(s.id) === subjectId);
      if (!subject) {
        return { success: false, error: `Subject with ID ${subjectId} does not exist.` };
      }

      // 3. Verify Subject assignment to Course
      if (targetCourseId && course) {
        const isAssigned = isSubjectAssignedToCourse(targetCourseId, subjectId);
        if (!isAssigned) {
          return {
            success: false,
            error: `Subject '${subject.subjectName}' is not assigned to course '${course.title}'.`,
          };
        }
      }

      // 4. Verify that Chapter exists
      const chapters = readChaptersFromDb();
      const chapter = chapters.find((ch) => Number(ch.id) === chapterId);
      if (!chapter) {
        return { success: false, error: `Chapter with ID ${chapterId} does not exist.` };
      }

      // 5. Verify that Chapter belongs to the selected Subject
      if (Number(chapter.subjectId) !== subjectId) {
        return {
          success: false,
          error: `Chapter '${chapter.chapterName}' belongs to a different subject. Please select a valid chapter for '${subject.subjectName}'.`,
        };
      }

      // 6. Verify Chapter belongs to Course (if Chapter has courseId)
      if (targetCourseId && course) {
        if (chapter.courseId && Number(chapter.courseId) !== targetCourseId) {
          return {
            success: false,
            error: `Chapter '${chapter.chapterName}' does not belong to course '${course.title}'.`,
          };
        }
      } else if (chapter.courseId) {
        targetCourseId = Number(chapter.courseId);
      }

      // 7. Academic Hierarchy: Topic validation (if provided)
      let targetTopicId = data.topicId !== undefined && data.topicId !== null ? Number(data.topicId) : undefined;
      if (targetTopicId && !isNaN(targetTopicId)) {
        const topics = readTopicsFromDb();
        const topic = topics.find((t) => Number(t.id) === targetTopicId);
        if (!topic) {
          return { success: false, error: `Topic with ID ${targetTopicId} does not exist.` };
        }
        if (Number(topic.chapterId) !== chapterId) {
          return {
            success: false,
            error: `Topic '${topic.topicName}' does not belong to chapter '${chapter.chapterName}'.`,
          };
        }
      }

      const difficulty: DifficultyLevel = (data.difficulty as DifficultyLevel) || 'Medium';

      // 6. Type-specific validation
      if (questionType === 'objective') {
        const optionA = String(data.optionA || '').trim();
        const optionB = String(data.optionB || '').trim();
        const optionC = String(data.optionC || '').trim();
        const optionD = String(data.optionD || '').trim();
        const correctOption = String(data.correctOption || '').toUpperCase() as CorrectOption;

        if (!optionA || !optionB || !optionC || !optionD) {
          return { success: false, error: 'All 4 options (Option A, B, C, D) are required for objective questions.' };
        }

        if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
          return { success: false, error: 'Exactly one valid correct answer option (A, B, C, or D) must be selected.' };
        }
      } else if (questionType === 'numerical') {
        if (data.rangeFrom === undefined || data.rangeFrom === null || String(data.rangeFrom).trim() === '') {
          return { success: false, error: 'Range From value is required for numerical questions.' };
        }
        if (data.rangeTo === undefined || data.rangeTo === null || String(data.rangeTo).trim() === '') {
          return { success: false, error: 'Range To value is required for numerical questions.' };
        }

        const numFrom = Number(data.rangeFrom);
        const numTo = Number(data.rangeTo);

        if (isNaN(numFrom) || isNaN(numTo)) {
          return { success: false, error: 'Range From and Range To must be valid numeric values.' };
        }

        if (numFrom > numTo) {
          return { success: false, error: 'Range From cannot be greater than Range To.' };
        }
      }

      const all = readQuestionsFromDb();
      const newId = all.length > 0 ? Math.max(...all.map((q) => Number(q.id) || 0)) + 1 : 1;
      const now = new Date().toISOString();

      const newQuestion: QuestionRecord = {
        id: newId,
        questionType,
        courseId: targetCourseId,
        subjectId,
        chapterId,
        topicId: targetTopicId,
        examId: data.examId ? Number(data.examId) : undefined,
        questionContent: sanitizeHtml(questionContent),
        optionA: data.optionA ? sanitizeHtml(data.optionA) : undefined,
        optionB: data.optionB ? sanitizeHtml(data.optionB) : undefined,
        optionC: data.optionC ? sanitizeHtml(data.optionC) : undefined,
        optionD: data.optionD ? sanitizeHtml(data.optionD) : undefined,
        correctOption: data.correctOption ? (String(data.correctOption).toUpperCase() as CorrectOption) : undefined,
        rangeFrom: data.rangeFrom !== undefined ? String(data.rangeFrom).trim() : undefined,
        rangeTo: data.rangeTo !== undefined ? String(data.rangeTo).trim() : undefined,
        tolerance: data.tolerance !== undefined ? String(data.tolerance).trim() : undefined,
        marks: data.marks !== undefined ? Number(data.marks) : 3,
        negativeMarks: data.negativeMarks !== undefined ? Number(data.negativeMarks) : -1,
        explanation: data.explanation ? sanitizeHtml(data.explanation) : '',
        difficulty,
        orderNumber: Number(data.orderNumber) || (all.filter((q) => q.questionType === questionType).length + 1),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user,
      };

      all.push(newQuestion);
      writeQuestionsToDb(all);

      return { success: true, question: newQuestion };
    } catch (err: any) {
      console.error('[createQuestion Exception]', err);
      return { success: false, error: err?.message || 'Failed to create question.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

// Update existing question with serialized concurrency lock
export async function updateQuestion(
  id: number,
  data: Partial<QuestionRecord> & Record<string, any>,
  user = 'Administrator'
): Promise<{ success: boolean; question?: QuestionRecord; error?: string }> {
  return questionMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('questions');

      const questionId = Number(id);
      const all = readQuestionsFromDb();
      const index = all.findIndex((q) => Number(q.id) === questionId);

      if (index === -1) {
        return { success: false, error: `Question with ID ${id} not found.` };
      }

      const existing = all[index];
      const targetCourseId = data.courseId !== undefined ? (data.courseId ? Number(data.courseId) : undefined) : existing.courseId;
      const targetSubjectId = data.subjectId !== undefined ? Number(data.subjectId) : existing.subjectId;
      const targetChapterId = data.chapterId !== undefined ? Number(data.chapterId) : existing.chapterId;
      const targetTopicId = data.topicId !== undefined ? (data.topicId ? Number(data.topicId) : undefined) : existing.topicId;
      const targetContent = data.questionContent !== undefined ? String(data.questionContent).trim() : existing.questionContent;

      if (!targetContent) {
        return { success: false, error: 'Question Content cannot be empty.' };
      }

      // If chapter changed or subject changed, verify relationship
      if (targetSubjectId !== existing.subjectId || targetChapterId !== existing.chapterId || targetCourseId !== existing.courseId) {
        const subjects = readSubjectsFromDb();
        const sub = subjects.find((s) => Number(s.id) === targetSubjectId);
        if (!sub) {
          return { success: false, error: `Subject with ID ${targetSubjectId} does not exist.` };
        }

        const chapters = readChaptersFromDb();
        const ch = chapters.find((c) => Number(c.id) === targetChapterId);
        if (!ch) {
          return { success: false, error: `Chapter with ID ${targetChapterId} does not exist.` };
        }
        if (Number(ch.subjectId) !== targetSubjectId) {
          return { success: false, error: `Selected chapter '${ch.chapterName}' does not belong to subject '${sub.subjectName}'.` };
        }

        if (targetCourseId) {
          const courses = readCoursesFromDb();
          const c = courses.find((course) => Number(course.id) === targetCourseId);
          if (!c) {
            return { success: false, error: `Course with ID ${targetCourseId} does not exist.` };
          }
          const isAssigned = isSubjectAssignedToCourse(targetCourseId, targetSubjectId);
          if (!isAssigned) {
            return { success: false, error: `Subject '${sub.subjectName}' is not assigned to course '${c.title}'.` };
          }
          if (ch.courseId && Number(ch.courseId) !== targetCourseId) {
            return { success: false, error: `Chapter '${ch.chapterName}' does not belong to course '${c.title}'.` };
          }
        }
      }

      if (targetTopicId) {
        const topics = readTopicsFromDb();
        const t = topics.find((top) => Number(top.id) === targetTopicId);
        if (!t) {
          return { success: false, error: `Topic with ID ${targetTopicId} does not exist.` };
        }
        if (Number(t.chapterId) !== targetChapterId) {
          return { success: false, error: `Topic '${t.topicName}' does not belong to selected chapter.` };
        }
      }

      // Type-specific update validation
      if (existing.questionType === 'objective') {
        const optA = data.optionA !== undefined ? String(data.optionA).trim() : existing.optionA;
        const optB = data.optionB !== undefined ? String(data.optionB).trim() : existing.optionB;
        const optC = data.optionC !== undefined ? String(data.optionC).trim() : existing.optionC;
        const optD = data.optionD !== undefined ? String(data.optionD).trim() : existing.optionD;
        const correct = data.correctOption !== undefined ? String(data.correctOption).toUpperCase() : existing.correctOption;

        if (!optA || !optB || !optC || !optD) {
          return { success: false, error: 'All 4 options (Option A, B, C, D) are required.' };
        }
        if (!['A', 'B', 'C', 'D'].includes(correct || '')) {
          return { success: false, error: 'Exactly one valid correct answer option (A, B, C, or D) must be selected.' };
        }
      } else if (existing.questionType === 'numerical') {
        const rFrom = data.rangeFrom !== undefined ? data.rangeFrom : existing.rangeFrom;
        const rTo = data.rangeTo !== undefined ? data.rangeTo : existing.rangeTo;

        const numFrom = Number(rFrom);
        const numTo = Number(rTo);

        if (isNaN(numFrom) || isNaN(numTo)) {
          return { success: false, error: 'Range From and Range To must be valid numbers.' };
        }
        if (numFrom > numTo) {
          return { success: false, error: 'Range From cannot be greater than Range To.' };
        }
      }

      const updated: QuestionRecord = {
        ...existing,
        courseId: targetCourseId,
        subjectId: targetSubjectId,
        chapterId: targetChapterId,
        topicId: targetTopicId,
        examId: data.examId !== undefined ? (data.examId ? Number(data.examId) : undefined) : existing.examId,
        questionContent: sanitizeHtml(targetContent),
        optionA: data.optionA !== undefined ? sanitizeHtml(data.optionA) : existing.optionA,
        optionB: data.optionB !== undefined ? sanitizeHtml(data.optionB) : existing.optionB,
        optionC: data.optionC !== undefined ? sanitizeHtml(data.optionC) : existing.optionC,
        optionD: data.optionD !== undefined ? sanitizeHtml(data.optionD) : existing.optionD,
        correctOption: data.correctOption !== undefined ? (String(data.correctOption).toUpperCase() as CorrectOption) : existing.correctOption,
        rangeFrom: data.rangeFrom !== undefined ? String(data.rangeFrom).trim() : existing.rangeFrom,
        rangeTo: data.rangeTo !== undefined ? String(data.rangeTo).trim() : existing.rangeTo,
        tolerance: data.tolerance !== undefined ? String(data.tolerance).trim() : existing.tolerance,
        marks: data.marks !== undefined ? Number(data.marks) : existing.marks,
        negativeMarks: data.negativeMarks !== undefined ? Number(data.negativeMarks) : existing.negativeMarks,
        explanation: data.explanation !== undefined ? sanitizeHtml(data.explanation) : existing.explanation,
        difficulty: (data.difficulty as DifficultyLevel) || existing.difficulty,
        orderNumber: data.orderNumber !== undefined ? Number(data.orderNumber) : existing.orderNumber,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        updatedAt: new Date().toISOString(),
        updatedBy: user,
      };

      all[index] = updated;
      writeQuestionsToDb(all);

      return { success: true, question: updated };
    } catch (err: any) {
      console.error('[updateQuestion Exception]', err);
      return { success: false, error: err?.message || 'Failed to update question.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

// Dependency check helper to determine whether Test Series or student attempts depend on a question
export function getQuestionDependencies(questionId: number): {
  count: number;
  details: string[];
  papers: Array<{ id: number; title: string; version: number }>;
  attemptsCount: number;
} {
  const details: string[] = [];
  const papers: Array<{ id: number; title: string; version: number }> = [];
  const qId = Number(questionId);

  // 1. Check all Test Series papers and version archives
  try {
    const cwd = process.cwd();
    const candidatePaths = [
      path.join(cwd, 'data', 'test-series.json'),
      path.join(cwd, 'frontend', 'data', 'test-series.json'),
      path.join(cwd, '..', 'data', 'test-series.json'),
    ];
    let tests: any[] = [];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          if (raw.trim()) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              tests = parsed;
              break;
            }
          }
        } catch {}
      }
    }

    for (const test of tests) {
      const inCurrent = Array.isArray(test.questionIds) && test.questionIds.map(Number).includes(qId);
      const inVersions = Array.isArray(test.versions) && test.versions.some(
        (v: any) => Array.isArray(v.questionIds) && v.questionIds.map(Number).includes(qId)
      );

      if (inCurrent || inVersions) {
        const detailStr = `Test #${test.id} ("${test.title}" v${test.version || 1})`;
        if (!details.includes(detailStr)) {
          details.push(detailStr);
          papers.push({ id: test.id, title: test.title, version: test.version || 1 });
        }
      }
    }
  } catch (err) {}

  // 2. Check student test attempts
  let attemptsCount = 0;
  try {
    const cwd = process.cwd();
    const attemptPaths = [
      path.join(cwd, 'data', 'test-attempts.json'),
      path.join(cwd, 'frontend', 'data', 'test-attempts.json'),
      path.join(cwd, '..', 'data', 'test-attempts.json'),
    ];
    let attempts: any[] = [];
    for (const p of attemptPaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          if (raw.trim()) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              attempts = parsed;
              break;
            }
          }
        } catch {}
      }
    }

    for (const att of attempts) {
      let isReferenced = false;
      if (att.questionSnapshots && att.questionSnapshots[String(qId)]) {
        isReferenced = true;
      } else if (att.responses && att.responses[String(qId)]) {
        isReferenced = true;
      }
      if (isReferenced) {
        attemptsCount++;
      }
    }

    if (attemptsCount > 0) {
      details.push(`${attemptsCount} student attempt(s)`);
    }
  } catch (err) {}

  const count = papers.length + attemptsCount;
  return { count, details, papers, attemptsCount };
}

// Delete question with dependency protection
export async function deleteQuestion(
  id: number
): Promise<{ success: boolean; error?: string; question?: QuestionRecord }> {
  return questionMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('questions');

      const questionId = Number(id);
      const all = readQuestionsFromDb();
      const index = all.findIndex((q) => Number(q.id) === questionId);

      if (index === -1) {
        return { success: false, error: `Question with ID ${id} not found.` };
      }

      const q = all[index];
      const deps = getQuestionDependencies(questionId);

      if (deps.count > 0) {
        return {
          success: false,
          error: `Cannot delete question #${q.id}: it is referenced by ${deps.count} Test Series (${deps.details.join(', ')}). Deactivate the question instead.`,
        };
      }

      const deleted = all.splice(index, 1)[0];
      writeQuestionsToDb(all);

      return { success: true, question: deleted };
    } catch (err: any) {
      console.error('[deleteQuestion Exception]', err);
      return { success: false, error: err?.message || 'Failed to delete question.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}
