import fs from 'fs';
import path from 'path';
import { readCoursesFromDb } from './courses';
import { readSubjectsFromDb, readCourseSubjectsFromDb } from './subjects';

export interface ChapterRecord {
  id: number;
  courseId: number;
  subjectId: number;
  chapterName: string;
  chapterCode?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Canonical default chapters establishing initial curriculum structure
export const CANONICAL_DEFAULT_CHAPTERS: ChapterRecord[] = [
  {
    id: 1,
    courseId: 1, // BITSAT 2026
    subjectId: 1, // Physics
    chapterName: 'Mechanics & Kinematics',
    chapterCode: 'BIT-PHY-01',
    slug: 'bitsat-physics-mechanics-kinematics',
    description: 'Vectors, 1D/2D Kinematics, Newton laws, Friction, and Work-Energy-Power.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 2,
    courseId: 1, // BITSAT 2026
    subjectId: 1, // Physics
    chapterName: 'Rotational Motion & Gravitation',
    chapterCode: 'BIT-PHY-02',
    slug: 'bitsat-physics-rotational-motion-gravitation',
    description: 'Center of mass, Moment of inertia, Torque, Angular momentum, and Gravitation.',
    displayOrder: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 3,
    courseId: 1, // BITSAT 2026
    subjectId: 2, // Chemistry
    chapterName: 'Physical Chemistry: Atomic Structure & Solutions',
    chapterCode: 'BIT-CHEM-01',
    slug: 'bitsat-chemistry-atomic-structure-solutions',
    description: 'Quantum numbers, Electronic configuration, Raoult law, and Colligative properties.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 4,
    courseId: 1, // BITSAT 2026
    subjectId: 3, // Mathematics
    chapterName: 'Calculus: Limits, Continuity & Derivatives',
    chapterCode: 'BIT-MATH-01',
    slug: 'bitsat-math-calculus-limits-derivatives',
    description: 'L’Hopital rule, Differentiability, Tangents and Normals, and Maxima-Minima.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 5,
    courseId: 2, // JEE Main 2026
    subjectId: 1, // Physics
    chapterName: 'Mechanics: Laws of Motion & Momentum',
    chapterCode: 'JEE-PHY-01',
    slug: 'jee-physics-laws-of-motion-momentum',
    description: 'Newtonian dynamics, Impulse-momentum theorem, Collisions in 1D and 2D.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 6,
    courseId: 2, // JEE Main 2026
    subjectId: 1, // Physics
    chapterName: 'Thermodynamics & Heat Transfer',
    chapterCode: 'JEE-PHY-02',
    slug: 'jee-physics-thermodynamics-heat-transfer',
    description: 'First and second laws of thermodynamics, Carnot cycle, and Thermal radiation.',
    displayOrder: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 7,
    courseId: 2, // JEE Main 2026
    subjectId: 2, // Chemistry
    chapterName: 'Chemical Bonding & Molecular Structure',
    chapterCode: 'JEE-CHEM-01',
    slug: 'jee-chemistry-chemical-bonding',
    description: 'VSEPR theory, Hybridization, Molecular orbital theory, and Hydrogen bonding.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
];

// Helper to determine persistent storage file paths for chapters
function getChapterDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'chapters.json'), path.join(persistentDir, 'chapters.json')] : []),
    path.join(cwd, 'data', 'chapters.json'),
    path.join(cwd, 'frontend', 'data', 'chapters.json'),
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
    const fallback = path.join(cwd, 'data', 'chapters.json');
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

export const chapterMutex = new AsyncMutex();

// Advisory cross-process file lock with timeout and stale lock recovery
async function acquireFileLock(lockName: string, timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getChapterDataPaths();
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

// Read chapters from disk with multi-path fallback and dual-mirroring synchronization
export function readChaptersFromDb(): ChapterRecord[] {
  const paths = getChapterDataPaths();
  let candidateWithData: { path: string; data: ChapterRecord[] } | null = null;
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
      console.error(`[DB Error] Reading chapters from ${filePath}:`, err);
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

  // Safe initialize with canonical default chapters
  writeChaptersToDb(CANONICAL_DEFAULT_CHAPTERS);
  return CANONICAL_DEFAULT_CHAPTERS;
}

// Write chapters atomically across all valid data paths
export function writeChaptersToDb(chapters: ChapterRecord[]): void {
  const json = JSON.stringify(chapters, null, 2);
  const paths = getChapterDataPaths();

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
      console.error(`[DB Error] Writing chapters to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, innerErr);
      }
    }
  }
}

// Helper to normalize strings into clean URL-friendly slugs
export function toSlug(str: string): string {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Validate that a subject is assigned to a course
export function isSubjectAssignedToCourse(courseId: number, subjectId: number): boolean {
  const joins = readCourseSubjectsFromDb();
  if (joins.length > 0) {
    const foundInJoins = joins.some(
      (j) => Number(j.courseId) === Number(courseId) && Number(j.subjectId) === Number(subjectId)
    );
    if (foundInJoins) return true;
  }

  // Also check course record subjectIds array for dual consistency
  const courses = readCoursesFromDb();
  const course = courses.find((c) => Number(c.id) === Number(courseId));
  if (course && Array.isArray(course.subjectIds)) {
    return course.subjectIds.some((sId) => Number(sId) === Number(subjectId));
  }

  return false;
}

// Query: Admin Chapters with course & subject details and optional filters
export function getAdminChapters(filters?: {
  courseId?: number;
  subjectId?: number;
  search?: string;
  isActive?: boolean;
}): Array<
  ChapterRecord & {
    courseTitle: string;
    courseExam?: string;
    subjectName: string;
    subjectCode?: string;
  }
> {
  const all = readChaptersFromDb();
  const courses = readCoursesFromDb();
  const subjects = readSubjectsFromDb();

  const courseMap = new Map<number, { title: string; exam?: string }>();
  courses.forEach((c) => courseMap.set(Number(c.id), { title: c.title, exam: c.exam }));

  const subjectMap = new Map<number, { name: string; code?: string }>();
  subjects.forEach((s) => subjectMap.set(Number(s.id), { name: s.subjectName, code: s.subjectCode }));

  let filtered = all;

  if (filters?.courseId) {
    const cId = Number(filters.courseId);
    filtered = filtered.filter((ch) => Number(ch.courseId) === cId);
  }

  if (filters?.subjectId) {
    const sId = Number(filters.subjectId);
    filtered = filtered.filter((ch) => Number(ch.subjectId) === sId);
  }

  if (filters?.isActive !== undefined) {
    filtered = filtered.filter((ch) => ch.isActive === filters.isActive);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter((ch) => {
      const cInfo = courseMap.get(Number(ch.courseId));
      const sInfo = subjectMap.get(Number(ch.subjectId));
      return (
        ch.chapterName.toLowerCase().includes(q) ||
        (ch.chapterCode && ch.chapterCode.toLowerCase().includes(q)) ||
        (cInfo && cInfo.title.toLowerCase().includes(q)) ||
        (sInfo && sInfo.name.toLowerCase().includes(q))
      );
    });
  }

  return filtered
    .map((ch) => {
      const cInfo = courseMap.get(Number(ch.courseId));
      const sInfo = subjectMap.get(Number(ch.subjectId));
      return {
        ...ch,
        courseTitle: cInfo ? cInfo.title : `Course #${ch.courseId}`,
        courseExam: cInfo?.exam,
        subjectName: sInfo ? sInfo.name : `Subject #${ch.subjectId}`,
        subjectCode: sInfo?.code,
      };
    })
    .sort((a, b) => {
      // Sort by Course, then Subject, then displayOrder, then chapterName
      if (Number(a.courseId) !== Number(b.courseId)) {
        return Number(a.courseId) - Number(b.courseId);
      }
      if (Number(a.subjectId) !== Number(b.subjectId)) {
        return Number(a.subjectId) - Number(b.subjectId);
      }
      return (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999);
    });
}

// Query: Get single chapter by ID
export function getChapterById(id: number): ChapterRecord | null {
  const all = readChaptersFromDb();
  const numId = Number(id);
  return all.find((c) => Number(c.id) === numId) || null;
}

// Query: Get public chapters for a course and subject (active only)
export function getChaptersByCourseAndSubject(courseId: number, subjectId: number): ChapterRecord[] {
  const all = readChaptersFromDb();
  const cId = Number(courseId);
  const sId = Number(subjectId);

  return all
    .filter((ch) => Number(ch.courseId) === cId && Number(ch.subjectId) === sId && ch.isActive !== false)
    .sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
}

// Create new chapter with strict validation, mutex serialization & advisory locking
export async function createChapter(
  data: {
    courseId: number;
    subjectId: number;
    chapterName: string;
    chapterCode?: string;
    slug?: string;
    description?: string;
    displayOrder?: number;
    isActive?: boolean;
  },
  user = 'Administrator'
): Promise<{ success: boolean; chapter?: ChapterRecord; error?: string }> {
  return chapterMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('chapters');

      const courseId = Number(data.courseId);
      const subjectId = Number(data.subjectId);
      const chapterName = String(data.chapterName || '').trim();

      if (!courseId || isNaN(courseId)) {
        return { success: false, error: 'A valid course must be selected.' };
      }
      if (!subjectId || isNaN(subjectId)) {
        return { success: false, error: 'A valid subject must be selected.' };
      }
      if (!chapterName) {
        return { success: false, error: 'Chapter Name is required.' };
      }

      // 1. Verify that the course exists
      const courses = readCoursesFromDb();
      const course = courses.find((c) => Number(c.id) === courseId);
      if (!course) {
        return { success: false, error: `Course with ID ${courseId} does not exist.` };
      }

      // 2. Verify that the subject exists
      const subjects = readSubjectsFromDb();
      const subject = subjects.find((s) => Number(s.id) === subjectId);
      if (!subject) {
        return { success: false, error: `Subject with ID ${subjectId} does not exist.` };
      }

      // 3. Verify that the subject is assigned to the selected course
      const isAssigned = isSubjectAssignedToCourse(courseId, subjectId);
      if (!isAssigned) {
        return {
          success: false,
          error: `Subject '${subject.subjectName}' is not assigned to course '${course.title}'. Please assign this subject to the course in Course Master first.`,
        };
      }

      // 4. Check chapterName uniqueness within this (courseId, subjectId) context
      const all = readChaptersFromDb();
      const duplicate = all.find(
        (ch) =>
          Number(ch.courseId) === courseId &&
          Number(ch.subjectId) === subjectId &&
          ch.chapterName.toLowerCase().trim() === chapterName.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `A chapter named '${chapterName}' already exists under '${subject.subjectName}' for this course.`,
        };
      }

      // 5. Generate safe ID and auto-slug
      const newId = all.length > 0 ? Math.max(...all.map((c) => Number(c.id) || 0)) + 1 : 1;
      const slugCandidate = data.slug?.trim()
        ? toSlug(data.slug)
        : toSlug(`${course.slug || course.title}-${subject.slug || subject.subjectName}-${chapterName}`);

      const now = new Date().toISOString();
      const newChapter: ChapterRecord = {
        id: newId,
        courseId,
        subjectId,
        chapterName,
        chapterCode: data.chapterCode?.trim() || undefined,
        slug: slugCandidate,
        description: data.description?.trim() || '',
        displayOrder: Number(data.displayOrder) || (all.filter((c) => Number(c.courseId) === courseId && Number(c.subjectId) === subjectId).length + 1),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user,
      };

      all.push(newChapter);
      writeChaptersToDb(all);

      return { success: true, chapter: newChapter };
    } catch (err: any) {
      console.error('[createChapter Exception]', err);
      return { success: false, error: err?.message || 'Failed to create chapter.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

// Update existing chapter with serialized concurrency lock
export async function updateChapter(
  id: number,
  data: Partial<ChapterRecord> & Record<string, any>,
  user = 'Administrator'
): Promise<{ success: boolean; chapter?: ChapterRecord; error?: string }> {
  return chapterMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('chapters');

      const chapterId = Number(id);
      const all = readChaptersFromDb();
      const index = all.findIndex((c) => Number(c.id) === chapterId);

      if (index === -1) {
        return { success: false, error: `Chapter with ID ${id} not found.` };
      }

      const existing = all[index];
      const targetCourseId = data.courseId !== undefined ? Number(data.courseId) : Number(existing.courseId);
      const targetSubjectId = data.subjectId !== undefined ? Number(data.subjectId) : Number(existing.subjectId);
      const targetChapterName = data.chapterName !== undefined ? String(data.chapterName).trim() : existing.chapterName;

      if (!targetChapterName) {
        return { success: false, error: 'Chapter Name cannot be empty.' };
      }

      // Check course and subject relationship validity if either changed
      if (targetCourseId !== Number(existing.courseId) || targetSubjectId !== Number(existing.subjectId)) {
        const isAssigned = isSubjectAssignedToCourse(targetCourseId, targetSubjectId);
        if (!isAssigned) {
          return {
            success: false,
            error: `The selected subject is not assigned to the selected course.`,
          };
        }
      }

      // Check uniqueness within the target (courseId, subjectId) context
      const duplicate = all.find(
        (ch) =>
          Number(ch.id) !== chapterId &&
          Number(ch.courseId) === targetCourseId &&
          Number(ch.subjectId) === targetSubjectId &&
          ch.chapterName.toLowerCase().trim() === targetChapterName.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `A chapter named '${targetChapterName}' already exists under this subject for this course.`,
        };
      }

      const updated: ChapterRecord = {
        ...existing,
        courseId: targetCourseId,
        subjectId: targetSubjectId,
        chapterName: targetChapterName,
        chapterCode: data.chapterCode !== undefined ? (data.chapterCode ? String(data.chapterCode).trim() : undefined) : existing.chapterCode,
        slug: data.slug !== undefined ? toSlug(data.slug) : existing.slug,
        description: data.description !== undefined ? String(data.description).trim() : existing.description,
        displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) || existing.displayOrder : existing.displayOrder,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        updatedAt: new Date().toISOString(),
        updatedBy: user,
      };

      all[index] = updated;
      writeChaptersToDb(all);

      return { success: true, chapter: updated };
    } catch (err: any) {
      console.error('[updateChapter Exception]', err);
      return { success: false, error: err?.message || 'Failed to update chapter.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

// Dependency check helper to determine whether resources depend on a chapter
export function getChapterDependencies(chapterId: number, chapterName: string): {
  count: number;
  details: string[];
} {
  const details: string[] = [];
  let count = 0;

  try {
    const cwd = process.cwd();
    const topCandidates = [
      path.join(cwd, 'data', 'topics.json'),
      path.join(cwd, 'frontend', 'data', 'topics.json'),
    ];

    for (const p of topCandidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const depTopics = parsed.filter((t: any) => Number(t.chapterId) === Number(chapterId));
            if (depTopics.length > 0) {
              count += depTopics.length;
              details.push(`${depTopics.length} topic(s) (e.g. '${depTopics[0].topicName}')`);
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[getChapterDependencies Error]', err);
  }

  return { count, details };
}

// Delete chapter with dependency protection
export async function deleteChapter(
  id: number
): Promise<{ success: boolean; error?: string; chapter?: ChapterRecord }> {
  return chapterMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('chapters');

      const chapterId = Number(id);
      const all = readChaptersFromDb();
      const index = all.findIndex((c) => Number(c.id) === chapterId);

      if (index === -1) {
        return { success: false, error: `Chapter with ID ${id} not found.` };
      }

      const chapter = all[index];

      // Dependency check
      const deps = getChapterDependencies(chapterId, chapter.chapterName);
      if (deps.count > 0) {
        return {
          success: false,
          error: `Cannot delete chapter '${chapter.chapterName}': it is referenced by ${deps.count} resource(s) (${deps.details.join(', ')}). Deactivate the chapter instead.`,
        };
      }

      const deleted = all.splice(index, 1)[0];
      writeChaptersToDb(all);

      return { success: true, chapter: deleted };
    } catch (err: any) {
      console.error('[deleteChapter Exception]', err);
      return { success: false, error: err?.message || 'Failed to delete chapter.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}
