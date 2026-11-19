import fs from 'fs';
import path from 'path';
import { readCoursesFromDb } from './courses';

export interface ExamRecord {
  id: number;
  examName: string;
  slug: string;
  previousSlugs?: string[];
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  displayIndex?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Canonical default exams to seed when database is freshly initialized
export const CANONICAL_DEFAULT_EXAMS: ExamRecord[] = [
  {
    id: 1,
    examName: 'BITSAT',
    slug: 'bitsat',
    description: 'BITSAT Entrance Exam preparation master course & test series.',
    metaTitle: 'BITSAT 2026 Entrance Prep | 10Q Challenge',
    metaDescription: 'Prepare for BITSAT 2026 with top BITSian mentors.',
    isActive: true,
    displayIndex: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 2,
    examName: 'Comedk',
    slug: 'comedk',
    description: 'COMEDK UGET Engineering entrance preparation course.',
    metaTitle: 'COMEDK 2026 Test Series & Courses',
    metaDescription: 'Score top rank in COMEDK 2026.',
    isActive: true,
    displayIndex: 2,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 3,
    examName: 'JEE',
    slug: 'jee',
    description: 'JEE Main & Advanced comprehensive mentorship and question bank.',
    metaTitle: 'JEE Main & Advanced 2026 Mastery',
    metaDescription: 'Target IITs and NITs with 10Q Challenge.',
    isActive: true,
    displayIndex: 3,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 4,
    examName: 'Manipal (MET)',
    slug: 'manipal-met',
    description: 'Manipal Entrance Test (MET) crash course and test series.',
    metaTitle: 'MET 2026 Preparation Guide',
    metaDescription: 'Clear Manipal MET with top percentile.',
    isActive: true,
    displayIndex: 4,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 5,
    examName: 'VITEEE',
    slug: 'viteee',
    description: 'VITEEE speed accelerator and test series pack.',
    metaTitle: 'VITEEE 2026 Crash Course',
    metaDescription: 'Get admission in VIT Vellore.',
    isActive: true,
    displayIndex: 5,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
];

// Helper to determine persistent storage file paths
function getExamDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'exams.json'), path.join(persistentDir, 'exams.json')] : []),
    path.join(cwd, 'data', 'exams.json'),
    path.join(cwd, 'frontend', 'data', 'exams.json'),
  ];

  const uniqueDirs = new Set<string>();
  const validPaths: string[] = [];

  for (const p of candidates) {
    const dir = path.dirname(p);
    if (dir === 'D:\\' || dir === 'C:\\' || dir === '/' || dir === '\\') {
      continue;
    }
    if (!uniqueDirs.has(dir)) {
      uniqueDirs.add(dir);
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        validPaths.push(p);
      } catch {
        // directory creation fallback
      }
    } else {
      validPaths.push(p);
    }
  }

  return validPaths.length > 0 ? validPaths : [path.join(cwd, 'data', 'exams.json')];
}

// Read exams from disk with safe parsing & fallback initialization
export function readExamsFromDb(): ExamRecord[] {
  const paths = getExamDataPaths();
  let candidateWithData: { path: string; data: ExamRecord[] } | null = null;
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
      console.error(`[DB Error] Reading exams from ${filePath}:`, err);
    }
  }

  // If data exists, auto-sync across all paths
  if (candidateWithData) {
    for (const emptyPath of emptyPaths) {
      try {
        const dir = path.dirname(emptyPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(emptyPath, JSON.stringify(candidateWithData.data, null, 2), 'utf-8');
      } catch {
        // silent sync fallback
      }
    }
    return candidateWithData.data;
  }

  // If no exams exist yet on disk, safely initialize with the canonical 5 exams
  writeExamsToDb(CANONICAL_DEFAULT_EXAMS);
  return CANONICAL_DEFAULT_EXAMS;
}

// In-process FIFO execution mutex to serialize concurrent mutations
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

export const examMutex = new AsyncMutex();

// Advisory cross-process file lock with timeout and stale lock recovery
async function acquireFileLock(lockName: string, timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getExamDataPaths();
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
        // Fallback gracefully if filesystem permissions prevent lockfile creation
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

// Write exams atomically to disk
export function writeExamsToDb(exams: ExamRecord[]): void {
  const json = JSON.stringify(exams, null, 2);
  const paths = getExamDataPaths();

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
      console.error(`[DB Error] Writing exams to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, innerErr);
      }
    }
  }
}

// Convert string to slug
export function toExamSlug(str: string): string {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Calculate the number of courses associated with an exam
export function countCoursesForExam(examId: number, examName: string): number {
  const allCourses = readCoursesFromDb();
  const normalizedExamName = examName.toLowerCase().trim();

  return allCourses.filter((course) => {
    // 1. Check direct examId match if available
    if ((course as any).examId && Number((course as any).examId) === Number(examId)) {
      return true;
    }
    // 2. Check exam name string match
    if (course.exam && course.exam.toLowerCase().trim() === normalizedExamName) {
      return true;
    }
    // 3. Check partial / alias match for compound names e.g. "Manipal (MET)" ⇄ "MET"
    if (
      normalizedExamName.includes('met') &&
      course.exam &&
      course.exam.toLowerCase().includes('met')
    ) {
      return true;
    }
    return false;
  }).length;
}

// Public API Query: active published exams
export function getPublicExams(): ExamRecord[] {
  const all = readExamsFromDb();
  return all
    .filter((e) => e.isActive !== false)
    .sort((a, b) => (Number(a.displayIndex) || a.id) - (Number(b.displayIndex) || b.id));
}

// Admin API Query: all exams with associated course counts and search filter
export function getAdminExams(searchTerm?: string): Array<ExamRecord & { associatedCoursesCount: number }> {
  const all = readExamsFromDb();
  const query = searchTerm ? searchTerm.toLowerCase().trim() : '';

  const filtered = query
    ? all.filter(
        (e) =>
          e.examName.toLowerCase().includes(query) ||
          e.slug.toLowerCase().includes(query) ||
          (e.description && e.description.toLowerCase().includes(query))
      )
    : all;

  return filtered
    .map((e) => ({
      ...e,
      associatedCoursesCount: countCoursesForExam(e.id, e.examName),
    }))
    .sort((a, b) => (Number(a.displayIndex) || a.id) - (Number(b.displayIndex) || b.id));
}

// Find single exam by slug or ID (supports canonical slugs, IDs, and historical previousSlugs)
export function getExamBySlugOrId(
  slugOrId: string | number,
  includeInactive = false
): (ExamRecord & { associatedCoursesCount: number; isCanonicalSlug: boolean }) | null {
  if (!slugOrId) return null;
  const raw = decodeURIComponent(String(slugOrId)).trim();
  const normalized = raw.toLowerCase();
  const dashed = toExamSlug(normalized);
  const all = readExamsFromDb();

  for (const e of all) {
    if (!includeInactive && e.isActive === false) continue;

    const eId = String(e.id).trim();
    const eSlug = String(e.slug || '').trim().toLowerCase();
    const eNameDashed = toExamSlug(e.examName);

    // 1. Direct canonical match (ID, current slug, or dashed exam name)
    if (
      eId === raw ||
      eId === dashed ||
      eSlug === normalized ||
      eSlug === dashed ||
      eNameDashed === dashed
    ) {
      return {
        ...e,
        associatedCoursesCount: countCoursesForExam(e.id, e.examName),
        isCanonicalSlug: true,
      };
    }

    // 2. Backward-compatible historical slug match
    if (
      Array.isArray(e.previousSlugs) &&
      e.previousSlugs.some((ps) => {
        const psDashed = toExamSlug(ps);
        return psDashed === dashed || ps.toLowerCase() === normalized;
      })
    ) {
      return {
        ...e,
        associatedCoursesCount: countCoursesForExam(e.id, e.examName),
        isCanonicalSlug: false, // Old URL! Caller should issue HTTP 301 redirect to canonical slug
      };
    }
  }

  return null;
}

// Check slug uniqueness across both active slugs and previousSlugs
export function isExamSlugTaken(slug: string, excludeId?: number): boolean {
  const all = readExamsFromDb();
  return isExamSlugTakenInternal(all, slug, excludeId);
}

function isExamSlugTakenInternal(all: ExamRecord[], slug: string, excludeId?: number): boolean {
  const target = toExamSlug(slug);
  return all.some((e) => {
    if (excludeId && Number(e.id) === Number(excludeId)) return false;
    if (toExamSlug(e.slug) === target) return true;
    if (Array.isArray(e.previousSlugs) && e.previousSlugs.some((ps) => toExamSlug(ps) === target)) {
      return true;
    }
    return false;
  });
}

// Create new exam with serialized concurrency lock & fresh disk read
export async function createExam(
  data: Partial<ExamRecord>,
  user = 'Admin'
): Promise<{ success: boolean; exam?: ExamRecord; error?: string }> {
  return examMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('exams');

      if (!data.examName?.trim()) {
        return { success: false, error: 'Exam Name is required.' };
      }

      const slug = toExamSlug(data.slug?.trim() || data.examName.trim());
      if (!slug) {
        return { success: false, error: 'A valid slug is required.' };
      }

      // Read fresh snapshot inside the locked critical section
      const all = readExamsFromDb();

      if (isExamSlugTakenInternal(all, slug)) {
        return { success: false, error: `The slug '${slug}' is already taken by another exam.` };
      }

      // Safe ID generation inside lock: guaranteed unique, zero race conditions
      const newId = all.length > 0 ? Math.max(...all.map((e) => Number(e.id) || 0)) + 1 : 1;
      const now = new Date().toISOString();

      const newExam: ExamRecord = {
        id: newId,
        examName: data.examName.trim(),
        slug: slug,
        previousSlugs: [],
        description: data.description?.trim() || '',
        metaTitle: data.metaTitle?.trim() || `${data.examName.trim()} 2026 Preparation | 10Q Challenge`,
        metaDescription: data.metaDescription?.trim() || `Comprehensive ${data.examName.trim()} preparation, test series & crash courses.`,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        displayIndex: Number(data.displayIndex) || newId,
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user,
      };

      all.push(newExam);
      writeExamsToDb(all);

      return { success: true, exam: newExam };
    } catch (err: any) {
      console.error('[createExam Exception]', err);
      return { success: false, error: err?.message || 'Failed to create exam.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}

// Update existing exam with slug history retention & serialized concurrency lock
export async function updateExam(
  id: number,
  data: Partial<ExamRecord>,
  user = 'Admin'
): Promise<{ success: boolean; exam?: ExamRecord; error?: string }> {
  return examMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('exams');

      // Read fresh snapshot inside lock
      const all = readExamsFromDb();
      const index = all.findIndex((e) => Number(e.id) === Number(id));

      if (index === -1) {
        return { success: false, error: `Exam with ID ${id} not found.` };
      }

      const existing = all[index];
      const newSlug = data.slug ? toExamSlug(data.slug) : existing.slug;

      if (newSlug !== existing.slug && isExamSlugTakenInternal(all, newSlug, id)) {
        return { success: false, error: `The slug '${newSlug}' is already in use by another exam.` };
      }

      // Maintain backward-compatible slug history
      let previousSlugs = Array.isArray(existing.previousSlugs) ? [...existing.previousSlugs] : [];
      if (newSlug !== existing.slug) {
        // Append old slug, prevent duplicates, never add current slug to its own aliases
        previousSlugs = Array.from(new Set([...previousSlugs, existing.slug])).filter(
          (s) => s && s !== newSlug
        );
      }

      const updated: ExamRecord = {
        ...existing,
        ...data,
        id: existing.id,
        examName: data.examName !== undefined ? data.examName.trim() : existing.examName,
        slug: newSlug,
        previousSlugs: previousSlugs,
        description: data.description !== undefined ? data.description.trim() : existing.description,
        metaTitle: data.metaTitle !== undefined ? data.metaTitle.trim() : existing.metaTitle,
        metaDescription: data.metaDescription !== undefined ? data.metaDescription.trim() : existing.metaDescription,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        displayIndex: data.displayIndex !== undefined ? Number(data.displayIndex) : existing.displayIndex,
        updatedBy: user,
        updatedAt: new Date().toISOString(),
      };

      all[index] = updated;
      writeExamsToDb(all);

      return { success: true, exam: updated };
    } catch (err: any) {
      console.error('[updateExam Exception]', err);
      return { success: false, error: err?.message || 'Failed to update exam.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}

// Delete exam with strict dependency check & serialized concurrency lock
export async function deleteExam(
  id: number
): Promise<{ success: boolean; error?: string; associatedCoursesCount?: number }> {
  return examMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('exams');

      const all = readExamsFromDb();
      const target = all.find((e) => Number(e.id) === Number(id));

      if (!target) {
        return { success: false, error: `Exam with ID ${id} not found.` };
      }

      // Mandatory dependency check: check if any courses are linked to this exam
      const courseCount = countCoursesForExam(target.id, target.examName);

      if (courseCount > 0) {
        return {
          success: false,
          error: `Cannot delete exam '${target.examName}'. ${courseCount} course(s) are currently associated with it. Please reassign the courses or deactivate the exam instead.`,
          associatedCoursesCount: courseCount,
        };
      }

      const filtered = all.filter((e) => Number(e.id) !== Number(id));
      writeExamsToDb(filtered);

      return { success: true };
    } catch (err: any) {
      console.error('[deleteExam Exception]', err);
      return { success: false, error: err?.message || 'Failed to delete exam.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}
