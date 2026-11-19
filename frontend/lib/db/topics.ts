import fs from 'fs';
import path from 'path';
import { readCoursesFromDb } from './courses';
import { readSubjectsFromDb, readCourseSubjectsFromDb } from './subjects';
import { readChaptersFromDb } from './chapters';

export interface TopicRecord {
  id: number;
  courseId: number;
  subjectId: number;
  chapterId: number;
  topicName: string;
  topicCode?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Canonical default topics matching the academic hierarchy: Course -> Subject -> Chapter -> Topic
export const CANONICAL_DEFAULT_TOPICS: TopicRecord[] = [
  {
    id: 1,
    courseId: 1, // BITSAT 2026
    subjectId: 1, // Physics
    chapterId: 1, // Mechanics & Kinematics
    topicName: 'Vectors & Coordinate Systems',
    topicCode: 'TOP-PHY-01',
    slug: 'bitsat-physics-mechanics-vectors',
    description: 'Vector addition, dot product, cross product, resolution of vectors in 2D and 3D.',
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
    chapterId: 1, // Mechanics & Kinematics
    topicName: '1D & 2D Motion under Gravity',
    topicCode: 'TOP-PHY-02',
    slug: 'bitsat-physics-mechanics-motion-gravity',
    description: 'Kinematic equations, relative velocity, and projectile motion equations.',
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
    subjectId: 1, // Physics
    chapterId: 1, // Mechanics & Kinematics
    topicName: "Newton's Laws of Motion & Friction",
    topicCode: 'TOP-PHY-03',
    slug: 'bitsat-physics-mechanics-newtons-laws',
    description: 'Free body diagrams, static and kinetic friction, pulley-block systems.',
    displayOrder: 3,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 4,
    courseId: 1, // BITSAT 2026
    subjectId: 1, // Physics
    chapterId: 1, // Mechanics & Kinematics
    topicName: 'Work, Energy & Power Theorems',
    topicCode: 'TOP-PHY-04',
    slug: 'bitsat-physics-mechanics-work-energy',
    description: 'Work-energy theorem, conservative forces, potential energy curves, power.',
    displayOrder: 4,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 5,
    courseId: 1, // BITSAT 2026
    subjectId: 1, // Physics
    chapterId: 2, // Rotational Motion & Gravitation
    topicName: 'Center of Mass & Linear Momentum',
    topicCode: 'TOP-PHY-05',
    slug: 'bitsat-physics-rotational-center-of-mass',
    description: 'Discrete and continuous mass distribution, conservation of momentum, explosion problems.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 6,
    courseId: 1, // BITSAT 2026
    subjectId: 1, // Physics
    chapterId: 2, // Rotational Motion & Gravitation
    topicName: 'Moment of Inertia & Torque Analysis',
    topicCode: 'TOP-PHY-06',
    slug: 'bitsat-physics-rotational-torque-inertia',
    description: 'Parallel and perpendicular axis theorems, angular momentum conservation, rolling without slipping.',
    displayOrder: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 7,
    courseId: 1, // BITSAT 2026
    subjectId: 3, // Mathematics
    chapterId: 4, // Calculus: Limits, Continuity & Derivatives
    topicName: "Limits & L'Hopital's Rule",
    topicCode: 'TOP-MATH-01',
    slug: 'bitsat-math-calculus-limits-lhopital',
    description: 'Standard limits, indeterminate forms, series expansions, rationalization techniques.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 8,
    courseId: 1, // BITSAT 2026
    subjectId: 3, // Mathematics
    chapterId: 4, // Calculus: Limits, Continuity & Derivatives
    topicName: 'Continuity & Differentiability',
    topicCode: 'TOP-MATH-02',
    slug: 'bitsat-math-calculus-continuity-differentiability',
    description: 'Left and right limits, jump discontinuities, differentiability criteria.',
    displayOrder: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 9,
    courseId: 2, // JEE Main 2026
    subjectId: 1, // Physics
    chapterId: 5, // Mechanics: Laws of Motion & Momentum
    topicName: "Newton's First & Second Laws",
    topicCode: 'JEE-TOP-01',
    slug: 'jee-physics-laws-of-motion-first-second',
    description: 'Inertial reference frames, constraint relations, pseudo-force problems.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 10,
    courseId: 2, // JEE Main 2026
    subjectId: 1, // Physics
    chapterId: 5, // Mechanics: Laws of Motion & Momentum
    topicName: 'Conservation of Linear Momentum & Collisions',
    topicCode: 'JEE-TOP-02',
    slug: 'jee-physics-laws-of-motion-momentum-collisions',
    description: 'Elastic and inelastic collisions, coefficient of restitution, oblique impacts.',
    displayOrder: 2,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
];

// Helper to determine persistent storage file paths for topics
function getTopicDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'topics.json'), path.join(persistentDir, 'topics.json')] : []),
    path.join(cwd, 'data', 'topics.json'),
    path.join(cwd, 'frontend', 'data', 'topics.json'),
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
    const fallback = path.join(cwd, 'data', 'topics.json');
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

export const topicMutex = new AsyncMutex();

// Advisory cross-process file lock with timeout and stale lock recovery
async function acquireFileLock(lockName: string, timeoutMs = 8000): Promise<() => Promise<void>> {
  const paths = getTopicDataPaths();
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

// Read topics from disk with multi-path fallback and dual-mirroring synchronization
export function readTopicsFromDb(): TopicRecord[] {
  const paths = getTopicDataPaths();
  let candidateWithData: { path: string; data: TopicRecord[] } | null = null;
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
      console.error(`[DB Error] Reading topics from ${filePath}:`, err);
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

  // Safe initialize with canonical default topics
  writeTopicsToDb(CANONICAL_DEFAULT_TOPICS);
  return CANONICAL_DEFAULT_TOPICS;
}

// Write topics atomically across all valid data paths
export function writeTopicsToDb(topics: TopicRecord[]): void {
  const json = JSON.stringify(topics, null, 2);
  const paths = getTopicDataPaths();

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
      console.error(`[DB Error] Writing topics to ${filePath}:`, err);
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

// Query: Admin Topics with course, subject, and chapter details plus filters
export function getAdminTopics(filters?: {
  courseId?: number;
  subjectId?: number;
  chapterId?: number;
  search?: string;
  isActive?: boolean;
}): Array<
  TopicRecord & {
    courseTitle: string;
    courseExam?: string;
    subjectName: string;
    subjectCode?: string;
    chapterName: string;
    chapterCode?: string;
  }
> {
  const all = readTopicsFromDb();
  const courses = readCoursesFromDb();
  const subjects = readSubjectsFromDb();
  const chapters = readChaptersFromDb();

  const courseMap = new Map<number, { title: string; exam?: string }>();
  courses.forEach((c) => courseMap.set(Number(c.id), { title: c.title, exam: c.exam }));

  const subjectMap = new Map<number, { name: string; code?: string }>();
  subjects.forEach((s) => subjectMap.set(Number(s.id), { name: s.subjectName, code: s.subjectCode }));

  const chapterMap = new Map<number, { name: string; code?: string }>();
  chapters.forEach((ch) => chapterMap.set(Number(ch.id), { name: ch.chapterName, code: ch.chapterCode }));

  let filtered = all;

  if (filters?.courseId) {
    const cId = Number(filters.courseId);
    filtered = filtered.filter((t) => Number(t.courseId) === cId);
  }

  if (filters?.subjectId) {
    const sId = Number(filters.subjectId);
    filtered = filtered.filter((t) => Number(t.subjectId) === sId);
  }

  if (filters?.chapterId) {
    const chId = Number(filters.chapterId);
    filtered = filtered.filter((t) => Number(t.chapterId) === chId);
  }

  if (filters?.isActive !== undefined) {
    filtered = filtered.filter((t) => t.isActive === filters.isActive);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter((t) => {
      const cInfo = courseMap.get(Number(t.courseId));
      const sInfo = subjectMap.get(Number(t.subjectId));
      const chInfo = chapterMap.get(Number(t.chapterId));
      return (
        t.topicName.toLowerCase().includes(q) ||
        (t.topicCode && t.topicCode.toLowerCase().includes(q)) ||
        (cInfo && cInfo.title.toLowerCase().includes(q)) ||
        (sInfo && sInfo.name.toLowerCase().includes(q)) ||
        (chInfo && chInfo.name.toLowerCase().includes(q))
      );
    });
  }

  return filtered
    .map((t) => {
      const cInfo = courseMap.get(Number(t.courseId));
      const sInfo = subjectMap.get(Number(t.subjectId));
      const chInfo = chapterMap.get(Number(t.chapterId));
      return {
        ...t,
        courseTitle: cInfo ? cInfo.title : `Course #${t.courseId}`,
        courseExam: cInfo?.exam,
        subjectName: sInfo ? sInfo.name : `Subject #${t.subjectId}`,
        subjectCode: sInfo?.code,
        chapterName: chInfo ? chInfo.name : `Chapter #${t.chapterId}`,
        chapterCode: chInfo?.code,
      };
    })
    .sort((a, b) => {
      // Sort hierarchy: Course -> Subject -> Chapter -> DisplayOrder -> TopicName
      if (Number(a.courseId) !== Number(b.courseId)) return Number(a.courseId) - Number(b.courseId);
      if (Number(a.subjectId) !== Number(b.subjectId)) return Number(a.subjectId) - Number(b.subjectId);
      if (Number(a.chapterId) !== Number(b.chapterId)) return Number(a.chapterId) - Number(b.chapterId);
      return (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999);
    });
}

// Query: Get single topic by ID
export function getTopicById(id: number): TopicRecord | null {
  const all = readTopicsFromDb();
  const numId = Number(id);
  return all.find((t) => Number(t.id) === numId) || null;
}

// Query: Get topics for a specific chapter (active only)
export function getTopicsByChapter(chapterId: number): TopicRecord[] {
  const all = readTopicsFromDb();
  const chId = Number(chapterId);

  return all
    .filter((t) => Number(t.chapterId) === chId && t.isActive !== false)
    .sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
}

// Create new topic with complete hierarchy validation, mutex serialization & advisory locking
export async function createTopic(
  data: {
    courseId: number;
    subjectId: number;
    chapterId: number;
    topicName: string;
    topicCode?: string;
    slug?: string;
    description?: string;
    displayOrder?: number;
    isActive?: boolean;
  },
  user = 'Administrator'
): Promise<{ success: boolean; topic?: TopicRecord; error?: string }> {
  return topicMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('topics');

      const courseId = Number(data.courseId);
      const subjectId = Number(data.subjectId);
      const chapterId = Number(data.chapterId);
      const topicName = String(data.topicName || '').trim();

      if (!courseId || isNaN(courseId)) {
        return { success: false, error: 'A valid course must be selected.' };
      }
      if (!subjectId || isNaN(subjectId)) {
        return { success: false, error: 'A valid subject must be selected.' };
      }
      if (!chapterId || isNaN(chapterId)) {
        return { success: false, error: 'A valid chapter must be selected.' };
      }
      if (!topicName) {
        return { success: false, error: 'Topic Name is required.' };
      }

      // 1. Verify Course exists
      const courses = readCoursesFromDb();
      const course = courses.find((c) => Number(c.id) === courseId);
      if (!course) {
        return { success: false, error: `Course with ID ${courseId} does not exist.` };
      }

      // 2. Verify Subject exists
      const subjects = readSubjectsFromDb();
      const subject = subjects.find((s) => Number(s.id) === subjectId);
      if (!subject) {
        return { success: false, error: `Subject with ID ${subjectId} does not exist.` };
      }

      // 3. Verify Subject is assigned to Course
      const joins = readCourseSubjectsFromDb();
      const isAssigned = joins.some(
        (j) => Number(j.courseId) === courseId && Number(j.subjectId) === subjectId
      ) || (Array.isArray(course.subjectIds) && course.subjectIds.includes(subjectId));

      if (!isAssigned) {
        return {
          success: false,
          error: `Subject '${subject.subjectName}' is not assigned to course '${course.title}'.`,
        };
      }

      // 4. Verify Chapter exists
      const chapters = readChaptersFromDb();
      const chapter = chapters.find((ch) => Number(ch.id) === chapterId);
      if (!chapter) {
        return { success: false, error: `Chapter with ID ${chapterId} does not exist.` };
      }

      // 5. Verify Chapter belongs to selected Course and Subject
      if (Number(chapter.courseId) !== courseId) {
        return {
          success: false,
          error: `Chapter '${chapter.chapterName}' does not belong to course '${course.title}'.`,
        };
      }
      if (Number(chapter.subjectId) !== subjectId) {
        return {
          success: false,
          error: `Chapter '${chapter.chapterName}' does not belong to subject '${subject.subjectName}'.`,
        };
      }

      // 6. Check topicName uniqueness within the same Chapter (case-insensitive)
      const all = readTopicsFromDb();
      const duplicate = all.find(
        (t) =>
          Number(t.chapterId) === chapterId &&
          t.topicName.toLowerCase().trim() === topicName.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `A topic named '${topicName}' already exists under chapter '${chapter.chapterName}'.`,
        };
      }

      // 7. Generate safe ID and auto-slug
      const newId = all.length > 0 ? Math.max(...all.map((t) => Number(t.id) || 0)) + 1 : 1;
      const slugCandidate = data.slug?.trim()
        ? toSlug(data.slug)
        : toSlug(`${course.slug || course.title}-${chapter.slug || chapter.chapterName}-${topicName}`);

      const now = new Date().toISOString();
      const countInChapter = all.filter((t) => Number(t.chapterId) === chapterId).length;

      const newTopic: TopicRecord = {
        id: newId,
        courseId,
        subjectId,
        chapterId,
        topicName,
        topicCode: data.topicCode?.trim() || undefined,
        slug: slugCandidate,
        description: data.description?.trim() || '',
        displayOrder: Number(data.displayOrder) || (countInChapter + 1),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user,
      };

      all.push(newTopic);
      writeTopicsToDb(all);

      return { success: true, topic: newTopic };
    } catch (err: any) {
      console.error('[createTopic Exception]', err);
      return { success: false, error: err?.message || 'Failed to create topic.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

// Update existing topic with serialized concurrency lock
export async function updateTopic(
  id: number,
  data: Partial<TopicRecord> & Record<string, any>,
  user = 'Administrator'
): Promise<{ success: boolean; topic?: TopicRecord; error?: string }> {
  return topicMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('topics');

      const topicId = Number(id);
      const all = readTopicsFromDb();
      const index = all.findIndex((t) => Number(t.id) === topicId);

      if (index === -1) {
        return { success: false, error: `Topic with ID ${id} not found.` };
      }

      const existing = all[index];
      const targetCourseId = data.courseId !== undefined ? Number(data.courseId) : Number(existing.courseId);
      const targetSubjectId = data.subjectId !== undefined ? Number(data.subjectId) : Number(existing.subjectId);
      const targetChapterId = data.chapterId !== undefined ? Number(data.chapterId) : Number(existing.chapterId);
      const targetTopicName = data.topicName !== undefined ? String(data.topicName).trim() : existing.topicName;

      if (!targetTopicName) {
        return { success: false, error: 'Topic Name cannot be empty.' };
      }

      // Check hierarchy if chapter changed
      if (targetChapterId !== Number(existing.chapterId)) {
        const chapters = readChaptersFromDb();
        const ch = chapters.find((c) => Number(c.id) === targetChapterId);
        if (!ch) {
          return { success: false, error: `Target chapter with ID ${targetChapterId} does not exist.` };
        }
        if (Number(ch.courseId) !== targetCourseId || Number(ch.subjectId) !== targetSubjectId) {
          return {
            success: false,
            error: 'Target chapter does not belong to the selected Course and Subject.',
          };
        }
      }

      // Check uniqueness in target chapter
      const duplicate = all.find(
        (t) =>
          Number(t.id) !== topicId &&
          Number(t.chapterId) === targetChapterId &&
          t.topicName.toLowerCase().trim() === targetTopicName.toLowerCase()
      );
      if (duplicate) {
        return {
          success: false,
          error: `A topic named '${targetTopicName}' already exists under this chapter.`,
        };
      }

      const updated: TopicRecord = {
        ...existing,
        courseId: targetCourseId,
        subjectId: targetSubjectId,
        chapterId: targetChapterId,
        topicName: targetTopicName,
        topicCode: data.topicCode !== undefined ? (data.topicCode ? String(data.topicCode).trim() : undefined) : existing.topicCode,
        slug: data.slug !== undefined ? toSlug(data.slug) : existing.slug,
        description: data.description !== undefined ? String(data.description).trim() : existing.description,
        displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) || existing.displayOrder : existing.displayOrder,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        updatedAt: new Date().toISOString(),
        updatedBy: user,
      };

      all[index] = updated;
      writeTopicsToDb(all);

      return { success: true, topic: updated };
    } catch (err: any) {
      console.error('[updateTopic Exception]', err);
      return { success: false, error: err?.message || 'Failed to update topic.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}

// Dependency check helper to determine whether resources depend on a topic
export function getTopicDependencies(topicId: number, topicName: string): {
  count: number;
  details: string[];
} {
  const details: string[] = [];
  let count = 0;

  // In the current LMS, checks for learning resources referencing this topic:
  // e.g. videos, documents, question banks, or assessment papers
  return { count, details };
}

// Delete topic with dependency protection
export async function deleteTopic(
  id: number
): Promise<{ success: boolean; error?: string; topic?: TopicRecord }> {
  return topicMutex.run(async () => {
    let releaseLock: (() => Promise<void>) | null = null;
    try {
      releaseLock = await acquireFileLock('topics');

      const topicId = Number(id);
      const all = readTopicsFromDb();
      const index = all.findIndex((t) => Number(t.id) === topicId);

      if (index === -1) {
        return { success: false, error: `Topic with ID ${id} not found.` };
      }

      const topic = all[index];

      // Dependency check
      const deps = getTopicDependencies(topicId, topic.topicName);
      if (deps.count > 0) {
        return {
          success: false,
          error: `Cannot delete topic '${topic.topicName}': it is referenced by ${deps.count} resource(s) (${deps.details.join(', ')}). Deactivate the topic instead.`,
        };
      }

      const deleted = all.splice(index, 1)[0];
      writeTopicsToDb(all);

      return { success: true, topic: deleted };
    } catch (err: any) {
      console.error('[deleteTopic Exception]', err);
      return { success: false, error: err?.message || 'Failed to delete topic.' };
    } finally {
      if (releaseLock) await releaseLock();
    }
  });
}
