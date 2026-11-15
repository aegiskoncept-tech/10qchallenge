import fs from 'fs';
import path from 'path';
import { readCoursesFromDb } from './courses';

export interface SubjectRecord {
  id: number;
  subjectCode: string;
  subjectName: string;
  slug: string;
  description?: string;
  isActive: boolean;
  displayIndex?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CourseSubjectRecord {
  id: number;
  courseId: number;
  subjectId: number;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

// Canonical default subjects matching the 10Q Challenge curriculum
export const CANONICAL_DEFAULT_SUBJECTS: SubjectRecord[] = [
  {
    id: 1,
    subjectCode: '101',
    subjectName: 'Physics',
    slug: 'physics',
    description: 'Comprehensive physics curriculum covering Mechanics, Electrodynamics, Optics, and Modern Physics.',
    isActive: true,
    displayIndex: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 2,
    subjectCode: '201',
    subjectName: 'Chemistry',
    slug: 'chemistry',
    description: 'Organic, Inorganic, and Physical Chemistry modules with formula sheets.',
    isActive: true,
    displayIndex: 2,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 3,
    subjectCode: '301',
    subjectName: 'Mathematics',
    slug: 'mathematics',
    description: 'Calculus, Algebra, Coordinate Geometry, Trigonometry, and Vectors.',
    isActive: true,
    displayIndex: 3,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 4,
    subjectCode: '204',
    subjectName: 'LR & English',
    slug: 'lr-english',
    description: 'Logical Reasoning and English Proficiency for BITSAT & engineering entrance exams.',
    isActive: true,
    displayIndex: 4,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 5,
    subjectCode: '302',
    subjectName: 'Aptitude',
    slug: 'aptitude',
    description: 'Quantitative aptitude, analytical problem solving, and data interpretation.',
    isActive: true,
    displayIndex: 5,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
];

// Helper to determine persistent storage file paths for subjects
function getSubjectDataPaths(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'subjects.json'),
    path.join(cwd, 'frontend', 'data', 'subjects.json'),
    path.join(cwd, '..', 'data', 'subjects.json'),
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
        // directory fallback
      }
    } else {
      validPaths.push(p);
    }
  }

  return validPaths.length > 0 ? validPaths : [path.join(cwd, 'data', 'subjects.json')];
}

// Helper to determine persistent storage file paths for course-subject relationships
function getCourseSubjectDataPaths(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'course-subjects.json'),
    path.join(cwd, 'frontend', 'data', 'course-subjects.json'),
    path.join(cwd, '..', 'data', 'course-subjects.json'),
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
        // directory fallback
      }
    } else {
      validPaths.push(p);
    }
  }

  return validPaths.length > 0 ? validPaths : [path.join(cwd, 'data', 'course-subjects.json')];
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

export const subjectMutex = new AsyncMutex();
export const courseSubjectMutex = new AsyncMutex();

// Advisory cross-process file lock with timeout and stale lock recovery
async function acquireFileLock(lockName: string, timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getSubjectDataPaths();
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

// Read subjects from disk with safe caching, multi-path fallback & auto-synchronization
export function readSubjectsFromDb(): SubjectRecord[] {
  const paths = getSubjectDataPaths();
  let candidateWithData: { path: string; data: SubjectRecord[] } | null = null;
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
      console.error(`[DB Error] Reading subjects from ${filePath}:`, err);
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

  // Safe initialize with canonical default subjects
  writeSubjectsToDb(CANONICAL_DEFAULT_SUBJECTS);
  return CANONICAL_DEFAULT_SUBJECTS;
}

// Write subjects atomically across all valid data paths
export function writeSubjectsToDb(subjects: SubjectRecord[]): void {
  const json = JSON.stringify(subjects, null, 2);
  const paths = getSubjectDataPaths();

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
      console.error(`[DB Error] Writing subjects to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, innerErr);
      }
    }
  }
}

// Read Course-Subject relationships from disk
export function readCourseSubjectsFromDb(): CourseSubjectRecord[] {
  const paths = getCourseSubjectDataPaths();
  let candidateWithData: { path: string; data: CourseSubjectRecord[] } | null = null;
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
      console.error(`[DB Error] Reading course-subjects from ${filePath}:`, err);
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

  return [];
}

// Write Course-Subject relationships atomically across all valid data paths
export function writeCourseSubjectsToDb(records: CourseSubjectRecord[]): void {
  const json = JSON.stringify(records, null, 2);
  const paths = getCourseSubjectDataPaths();

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
      console.error(`[DB Error] Writing course-subjects to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, innerErr);
      }
    }
  }
}

// Convert string to URL-friendly slug
export function toSubjectSlug(str: string): string {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Normalize code (uppercase, trim)
export function normalizeSubjectCode(code: string): string {
  return String(code || '')
    .trim()
    .toUpperCase();
}

// Normalize name (trim)
export function normalizeSubjectName(name: string): string {
  return String(name || '').trim();
}

// Get all courses associated with a subject
export function getCoursesForSubject(subjectId: number): Array<{ id: number; title: string; exam?: string }> {
  const relationships = readCourseSubjectsFromDb();
  const allCourses = readCoursesFromDb();

  const assignedCourseIds = new Set(
    relationships
      .filter((r) => Number(r.subjectId) === Number(subjectId))
      .map((r) => Number(r.courseId))
  );

  return allCourses
    .filter((c) => assignedCourseIds.has(Number(c.id)))
    .map((c) => ({
      id: c.id,
      title: c.title,
      exam: c.exam,
    }));
}

// Count courses associated with a subject
export function countCoursesForSubject(subjectId: number): number {
  return getCoursesForSubject(subjectId).length;
}

// Get all subjects assigned to a specific course (ordered by displayOrder)
export function getSubjectsForCourse(courseId: number): SubjectRecord[] {
  const relationships = readCourseSubjectsFromDb();
  const allSubjects = readSubjectsFromDb();

  const subjectMap = new Map<number, SubjectRecord>();
  allSubjects.forEach((s) => subjectMap.set(Number(s.id), s));

  return relationships
    .filter((r) => Number(r.courseId) === Number(courseId))
    .sort((a, b) => (Number(a.displayOrder) || a.id) - (Number(b.displayOrder) || b.id))
    .map((r) => subjectMap.get(Number(r.subjectId)))
    .filter((s): s is SubjectRecord => Boolean(s));
}

// Public API Query: active subjects
export function getPublicSubjects(): SubjectRecord[] {
  const all = readSubjectsFromDb();
  return all
    .filter((s) => s.isActive !== false)
    .sort((a, b) => (Number(a.displayIndex) || a.id) - (Number(b.displayIndex) || b.id));
}

// Admin API Query: all subjects with associated course counts and search filter
export function getAdminSubjects(searchTerm?: string): Array<
  SubjectRecord & {
    associatedCoursesCount: number;
    associatedCourses: Array<{ id: number; title: string; exam?: string }>;
  }
> {
  const all = readSubjectsFromDb();
  const query = searchTerm ? searchTerm.toLowerCase().trim() : '';

  const filtered = query
    ? all.filter(
        (s) =>
          s.subjectCode.toLowerCase().includes(query) ||
          s.subjectName.toLowerCase().includes(query) ||
          s.slug.toLowerCase().includes(query) ||
          (s.description && s.description.toLowerCase().includes(query))
      )
    : all;

  return filtered
    .map((s) => {
      const courses = getCoursesForSubject(s.id);
      return {
        ...s,
        associatedCoursesCount: courses.length,
        associatedCourses: courses,
      };
    })
    .sort((a, b) => (Number(a.displayIndex) || a.id) - (Number(b.displayIndex) || b.id));
}

// Find single subject by ID
export function getSubjectById(
  id: number
): (SubjectRecord & {
  associatedCoursesCount: number;
  associatedCourses: Array<{ id: number; title: string; exam?: string }>;
}) | null {
  const all = readSubjectsFromDb();
  const found = all.find((s) => Number(s.id) === Number(id));
  if (!found) return null;

  const courses = getCoursesForSubject(found.id);
  return {
    ...found,
    associatedCoursesCount: courses.length,
    associatedCourses: courses,
  };
}

// Check subject code uniqueness
export function isSubjectCodeTaken(subjectCode: string, excludeId?: number): boolean {
  const target = normalizeSubjectCode(subjectCode);
  const all = readSubjectsFromDb();
  return all.some((s) => {
    if (excludeId && Number(s.id) === Number(excludeId)) return false;
    return normalizeSubjectCode(s.subjectCode) === target;
  });
}

// Check subject name uniqueness
export function isSubjectNameTaken(subjectName: string, excludeId?: number): boolean {
  const target = normalizeSubjectName(subjectName).toLowerCase();
  const all = readSubjectsFromDb();
  return all.some((s) => {
    if (excludeId && Number(s.id) === Number(excludeId)) return false;
    return normalizeSubjectName(s.subjectName).toLowerCase() === target;
  });
}

// Create new subject
export async function createSubject(
  data: Partial<SubjectRecord>,
  user = 'Admin'
): Promise<{ success: boolean; subject?: SubjectRecord; error?: string }> {
  return subjectMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('subjects');

      const code = normalizeSubjectCode(data.subjectCode || '');
      const name = normalizeSubjectName(data.subjectName || '');

      if (!code) {
        return { success: false, error: 'Subject Code is required.' };
      }
      if (!name) {
        return { success: false, error: 'Subject Name is required.' };
      }

      const all = readSubjectsFromDb();

      if (all.some((s) => normalizeSubjectCode(s.subjectCode) === code)) {
        return { success: false, error: `Subject Code '${code}' is already registered.` };
      }
      if (all.some((s) => normalizeSubjectName(s.subjectName).toLowerCase() === name.toLowerCase())) {
        return { success: false, error: `Subject Name '${name}' already exists.` };
      }

      const slug = toSubjectSlug(data.slug || name);
      const newId = all.length > 0 ? Math.max(...all.map((s) => Number(s.id) || 0)) + 1 : 1;
      const now = new Date().toISOString();

      const newSubject: SubjectRecord = {
        id: newId,
        subjectCode: code,
        subjectName: name,
        slug: slug,
        description: data.description?.trim() || '',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        displayIndex: Number(data.displayIndex) || newId,
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user,
      };

      all.push(newSubject);
      writeSubjectsToDb(all);

      return { success: true, subject: newSubject };
    } catch (err: any) {
      console.error('[createSubject Exception]', err);
      return { success: false, error: err?.message || 'Failed to create subject.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}

// Update existing subject
export async function updateSubject(
  id: number,
  data: Partial<SubjectRecord>,
  user = 'Admin'
): Promise<{ success: boolean; subject?: SubjectRecord; error?: string }> {
  return subjectMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('subjects');

      const all = readSubjectsFromDb();
      const index = all.findIndex((s) => Number(s.id) === Number(id));

      if (index === -1) {
        return { success: false, error: `Subject with ID ${id} not found.` };
      }

      const existing = all[index];
      const newCode = data.subjectCode !== undefined ? normalizeSubjectCode(data.subjectCode) : existing.subjectCode;
      const newName = data.subjectName !== undefined ? normalizeSubjectName(data.subjectName) : existing.subjectName;

      if (!newCode) {
        return { success: false, error: 'Subject Code cannot be empty.' };
      }
      if (!newName) {
        return { success: false, error: 'Subject Name cannot be empty.' };
      }

      if (newCode !== existing.subjectCode && all.some((s) => Number(s.id) !== Number(id) && normalizeSubjectCode(s.subjectCode) === newCode)) {
        return { success: false, error: `Subject Code '${newCode}' is already in use by another subject.` };
      }
      if (newName.toLowerCase() !== existing.subjectName.toLowerCase() && all.some((s) => Number(s.id) !== Number(id) && normalizeSubjectName(s.subjectName).toLowerCase() === newName.toLowerCase())) {
        return { success: false, error: `Subject Name '${newName}' is already in use by another subject.` };
      }

      const newSlug = data.slug ? toSubjectSlug(data.slug) : toSubjectSlug(newName);

      const updated: SubjectRecord = {
        ...existing,
        ...data,
        id: existing.id,
        subjectCode: newCode,
        subjectName: newName,
        slug: newSlug,
        description: data.description !== undefined ? data.description.trim() : existing.description,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        displayIndex: data.displayIndex !== undefined ? Number(data.displayIndex) : existing.displayIndex,
        updatedBy: user,
        updatedAt: new Date().toISOString(),
      };

      all[index] = updated;
      writeSubjectsToDb(all);

      return { success: true, subject: updated };
    } catch (err: any) {
      console.error('[updateSubject Exception]', err);
      return { success: false, error: err?.message || 'Failed to update subject.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}

// Delete subject with strict dependency check
export async function deleteSubject(
  id: number
): Promise<{ success: boolean; error?: string; associatedCoursesCount?: number }> {
  return subjectMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('subjects');

      const all = readSubjectsFromDb();
      const target = all.find((s) => Number(s.id) === Number(id));

      if (!target) {
        return { success: false, error: `Subject with ID ${id} not found.` };
      }

      // Mandatory dependency check: verify if any course uses this subject
      const assignedCourses = getCoursesForSubject(target.id);
      if (assignedCourses.length > 0) {
        const courseNames = assignedCourses.map((c) => `'${c.title}'`).join(', ');
        return {
          success: false,
          error: `Cannot delete subject '${target.subjectName}'. It is currently assigned to ${assignedCourses.length} course(s): ${courseNames}. Please remove the subject from those courses or deactivate the subject instead.`,
          associatedCoursesCount: assignedCourses.length,
        };
      }

      const filtered = all.filter((s) => Number(s.id) !== Number(id));
      writeSubjectsToDb(filtered);

      return { success: true };
    } catch (err: any) {
      console.error('[deleteSubject Exception]', err);
      return { success: false, error: err?.message || 'Failed to delete subject.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}

// Assign subjects to a course (Many-to-Many Relationship Manager)
export async function assignSubjectsToCourse(
  courseId: number,
  subjectIds: number[]
): Promise<{ success: boolean; assignedCount: number; error?: string }> {
  return courseSubjectMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('course-subjects');

      const numCourseId = Number(courseId);
      if (!numCourseId || isNaN(numCourseId)) {
        return { success: false, assignedCount: 0, error: 'Valid courseId is required.' };
      }

      // Deduplicate subject IDs and preserve order
      const uniqueSubjectIds: number[] = [];
      const seen = new Set<number>();
      for (const sid of subjectIds) {
        const n = Number(sid);
        if (n && !isNaN(n) && !seen.has(n)) {
          seen.add(n);
          uniqueSubjectIds.push(n);
        }
      }

      // Verify all subject IDs exist in Subject Master
      const allSubjects = readSubjectsFromDb();
      const existingSubjectMap = new Map(allSubjects.map((s) => [Number(s.id), s]));

      const validSubjectIds = uniqueSubjectIds.filter((sid) => existingSubjectMap.has(sid));

      // Read current relationships
      const allRelationships = readCourseSubjectsFromDb();

      // Remove existing relationships for THIS course
      const remainingRelationships = allRelationships.filter((r) => Number(r.courseId) !== numCourseId);

      // Generate new relationship rows
      let maxRelId = remainingRelationships.length > 0
        ? Math.max(...remainingRelationships.map((r) => Number(r.id) || 0))
        : 0;

      const now = new Date().toISOString();
      const newRelationships: CourseSubjectRecord[] = validSubjectIds.map((sid, idx) => ({
        id: ++maxRelId,
        courseId: numCourseId,
        subjectId: sid,
        displayOrder: idx + 1,
        createdAt: now,
        updatedAt: now,
      }));

      const finalRelationships = [...remainingRelationships, ...newRelationships];
      writeCourseSubjectsToDb(finalRelationships);

      return { success: true, assignedCount: newRelationships.length };
    } catch (err: any) {
      console.error('[assignSubjectsToCourse Exception]', err);
      return { success: false, assignedCount: 0, error: err?.message || 'Failed to assign subjects to course.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}

// Remove a single subject assignment from a course
export async function removeSubjectFromCourse(
  courseId: number,
  subjectId: number
): Promise<{ success: boolean; error?: string }> {
  return courseSubjectMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('course-subjects');

      const all = readCourseSubjectsFromDb();
      const filtered = all.filter(
        (r) => !(Number(r.courseId) === Number(courseId) && Number(r.subjectId) === Number(subjectId))
      );

      writeCourseSubjectsToDb(filtered);
      return { success: true };
    } catch (err: any) {
      console.error('[removeSubjectFromCourse Exception]', err);
      return { success: false, error: err?.message || 'Failed to remove subject from course.' };
    } finally {
      if (releaseLock) {
        await releaseLock();
      }
    }
  });
}
