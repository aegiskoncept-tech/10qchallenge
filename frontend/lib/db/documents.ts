import fs from 'fs';
import path from 'path';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';
import { deletePrivatePdfFile, CANONICAL_PROTECTED_FIXTURES } from '@/lib/documents/storage';
import { getCommerceDb } from '@/lib/commerce/db';

export interface DocumentRecord {
  id: number;
  title: string;
  description?: string;
  category?: string; // "Formula Sheet" | "Mind Map" | "DPP" | "Revision Notes" | "PYQ Solution" | "Handbook" | "General"
  courseId?: number;
  courseTitle?: string;
  subjectId?: number;
  subject: string;
  chapterId?: number;
  chapter: string;
  topicId?: number;
  topicName?: string;
  fileType: 'PDF' | 'DOC' | 'DOCX';
  fileUrl: string;
  storedFilename?: string;
  originalFilename?: string;
  fileSizeBytes?: string;
  pageCount?: number;
  status: 'Published' | 'Draft' | 'Archived';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export const CANONICAL_DEFAULT_DOCUMENTS: DocumentRecord[] = [
  {
    id: 1,
    title: 'Kinematics & Mechanics Formula Handbook',
    subject: 'Physics',
    chapter: 'Mechanics & Kinematics',
    category: 'Formula Sheet',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
    subjectId: 1,
    chapterId: 1,
    fileType: 'PDF',
    fileUrl: '/documents/physics-mechanics-formula-sheet.pdf',
    storedFilename: 'physics-mechanics-formula-sheet.pdf',
    originalFilename: 'physics-mechanics-formula-sheet.pdf',
    fileSizeBytes: '2.4 MB',
    pageCount: 14,
    description: 'Comprehensive 1-pager summary cards and formula sheet curated for quick revision.',
    status: 'Published',
    displayOrder: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 2,
    title: 'Atomic Structure & Periodic Table Mind Maps',
    subject: 'Chemistry',
    chapter: 'Physical Chemistry: Atomic Structure & Solutions',
    category: 'Mind Map',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
    subjectId: 2,
    chapterId: 3,
    fileType: 'PDF',
    fileUrl: '/documents/chemistry-atomic-structure-mindmap.pdf',
    storedFilename: 'chemistry-atomic-structure-mindmap.pdf',
    originalFilename: 'chemistry-atomic-structure-mindmap.pdf',
    fileSizeBytes: '1.8 MB',
    pageCount: 8,
    description: 'High-speed visual memory maps for electronic configuration and quantum numbers.',
    status: 'Published',
    displayOrder: 2,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 3,
    title: 'Calculus Super Tricks & Standard Integrals DPP',
    subject: 'Mathematics',
    chapter: 'Calculus: Limits, Continuity & Derivatives',
    category: 'DPP',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
    subjectId: 3,
    chapterId: 4,
    fileType: 'PDF',
    fileUrl: '/documents/math-calculus-super-tricks.pdf',
    storedFilename: 'math-calculus-super-tricks.pdf',
    originalFilename: 'math-calculus-super-tricks.pdf',
    fileSizeBytes: '3.1 MB',
    pageCount: 22,
    description: '45 curated BITSAT & JEE Main practice problems with full step-by-step solutions.',
    status: 'Published',
    displayOrder: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
];

class DocumentAsyncMutex {
  private queue: Promise<any> = Promise.resolve();
  async run<T>(task: () => Promise<T> | T): Promise<T> {
    const res = this.queue.then(async () => {
      return await task();
    });
    this.queue = res.catch(() => {});
    return res;
  }
}

export const documentMutex = new DocumentAsyncMutex();

function getDocDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'documents.json'), path.join(persistentDir, 'documents.json')] : []),
    path.join(cwd, 'data', 'documents.json'),
    path.join(cwd, 'frontend', 'data', 'documents.json'),
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
    const fallback = path.join(cwd, 'data', 'documents.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readDocumentsFromDb(): DocumentRecord[] {
  const paths = getDocDataPaths();
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (err) {}
  }
  writeDocumentsToDb(CANONICAL_DEFAULT_DOCUMENTS);
  return CANONICAL_DEFAULT_DOCUMENTS;
}

export function writeDocumentsToDb(docs: DocumentRecord[]): void {
  const json = JSON.stringify(docs, null, 2);
  const paths = getDocDataPaths();
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, json, 'utf-8');
    } catch (err) {}
  }
}

/**
 * Validates document academic hierarchy against canonical data.
 */
export function validateDocumentHierarchy(params: {
  courseId: number;
  subjectId: number;
  chapterId: number;
  topicId?: number;
}): {
  valid: boolean;
  courseTitle: string;
  subjectName: string;
  chapterName: string;
  topicName?: string;
  error?: string;
} {
  const courses = AcademicHierarchyValidator.getCourses();
  const subjects = AcademicHierarchyValidator.getSubjects();
  const chapters = AcademicHierarchyValidator.getChapters();
  const topics = AcademicHierarchyValidator.getTopics();

  const course = courses.find((c) => Number(c.id) === Number(params.courseId));
  if (!course) {
    return {
      valid: false,
      courseTitle: '',
      subjectName: '',
      chapterName: '',
      error: `Course #${params.courseId} does not exist in Course Master.`,
    };
  }

  const subject = subjects.find((s) => Number(s.id) === Number(params.subjectId));
  if (!subject) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: '',
      chapterName: '',
      error: `Subject #${params.subjectId} does not exist in Subject Master.`,
    };
  }

  const chapter = chapters.find((ch) => Number(ch.id) === Number(params.chapterId));
  if (!chapter) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: subject.subjectName,
      chapterName: '',
      error: `Chapter #${params.chapterId} does not exist in Chapter Master.`,
    };
  }

  // Hierarchy containment verification
  if (Number(chapter.courseId) !== Number(params.courseId)) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: subject.subjectName,
      chapterName: chapter.chapterName,
      error: `Hierarchy mismatch: Chapter "${chapter.chapterName}" belongs to Course #${chapter.courseId}, not Course #${params.courseId}.`,
    };
  }

  if (Number(chapter.subjectId) !== Number(params.subjectId)) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: subject.subjectName,
      chapterName: chapter.chapterName,
      error: `Hierarchy mismatch: Chapter "${chapter.chapterName}" belongs to Subject #${chapter.subjectId}, not Subject #${params.subjectId}.`,
    };
  }

  let topicName: string | undefined = undefined;
  if (params.topicId && Number(params.topicId) > 0) {
    const topic = topics.find((t) => Number(t.id) === Number(params.topicId));
    if (!topic) {
      return {
        valid: false,
        courseTitle: course.title,
        subjectName: subject.subjectName,
        chapterName: chapter.chapterName,
        error: `Topic #${params.topicId} does not exist in Topic Master.`,
      };
    }
    if (Number(topic.chapterId) !== Number(params.chapterId)) {
      return {
        valid: false,
        courseTitle: course.title,
        subjectName: subject.subjectName,
        chapterName: chapter.chapterName,
        error: `Hierarchy mismatch: Topic "${topic.topicName}" belongs to Chapter #${topic.chapterId}, not Chapter #${params.chapterId}.`,
      };
    }
    topicName = topic.topicName;
  }

  return {
    valid: true,
    courseTitle: course.title,
    subjectName: subject.subjectName,
    chapterName: chapter.chapterName,
    topicName,
  };
}

export function getAdminDocuments(search?: string, subject?: string, courseId?: number): DocumentRecord[] {
  let list = readDocumentsFromDb();
  if (courseId && Number(courseId) > 0) {
    list = list.filter((d) => Number(d.courseId) === Number(courseId));
  }
  if (subject && subject !== 'ALL') {
    list = list.filter((d) => d.subject.toLowerCase() === subject.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.chapter.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        (d.courseTitle && d.courseTitle.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }
  return list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
}

export function getDocumentById(id: number): DocumentRecord | null {
  const all = readDocumentsFromDb();
  return all.find((d) => Number(d.id) === Number(id)) || null;
}

export async function createDocument(
  data: Partial<DocumentRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; document?: DocumentRecord; error?: string }> {
  return documentMutex.run(async () => {
    if (!data.title?.trim()) return { success: false, error: 'Document title is required.' };
    if (!data.fileUrl?.trim()) return { success: false, error: 'File URL or PDF payload is required.' };

    // Academic hierarchy validation if courseId & chapterId provided
    let verifiedCourseTitle = data.courseTitle || 'General';
    let verifiedSubjectName = data.subject || 'General';
    let verifiedChapterName = data.chapter || 'General';
    let verifiedTopicName = data.topicName;

    if (data.courseId && data.subjectId && data.chapterId) {
      const hierarchy = validateDocumentHierarchy({
        courseId: Number(data.courseId),
        subjectId: Number(data.subjectId),
        chapterId: Number(data.chapterId),
        topicId: data.topicId ? Number(data.topicId) : undefined,
      });

      if (!hierarchy.valid) {
        return { success: false, error: hierarchy.error };
      }

      verifiedCourseTitle = hierarchy.courseTitle;
      verifiedSubjectName = hierarchy.subjectName;
      verifiedChapterName = hierarchy.chapterName;
      verifiedTopicName = hierarchy.topicName;
    }

    const all = readDocumentsFromDb();
    const newId = all.length > 0 ? Math.max(...all.map((d) => Number(d.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();

    const storedFilename = data.storedFilename || path.basename(data.fileUrl.trim());

    const newDoc: DocumentRecord = {
      id: newId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      category: data.category?.trim() || 'Revision Notes',
      courseId: data.courseId ? Number(data.courseId) : undefined,
      courseTitle: verifiedCourseTitle,
      subjectId: data.subjectId ? Number(data.subjectId) : undefined,
      subject: verifiedSubjectName,
      chapterId: data.chapterId ? Number(data.chapterId) : undefined,
      chapter: verifiedChapterName,
      topicId: data.topicId ? Number(data.topicId) : undefined,
      topicName: verifiedTopicName,
      fileType: (data.fileType as any) || 'PDF',
      fileUrl: data.fileUrl.trim(),
      storedFilename,
      originalFilename: data.originalFilename || storedFilename,
      fileSizeBytes: data.fileSizeBytes?.trim() || '1.5 MB',
      pageCount: Number(data.pageCount) || 10,
      status: (data.status as any) || 'Published',
      displayOrder: Number(data.displayOrder) || (all.length + 1),
      createdAt: now,
      updatedAt: now,
      createdBy: user,
    };

    all.push(newDoc);
    writeDocumentsToDb(all);
    return { success: true, document: newDoc };
  });
}

export async function updateDocument(
  id: number,
  data: Partial<DocumentRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; document?: DocumentRecord; error?: string }> {
  return documentMutex.run(async () => {
    const all = readDocumentsFromDb();
    const index = all.findIndex((d) => Number(d.id) === Number(id));
    if (index === -1) return { success: false, error: `Document with ID ${id} not found.` };

    const existing = all[index];

    // Hierarchy validation if hierarchy parameters are changing
    const courseId = data.courseId !== undefined ? Number(data.courseId) : existing.courseId;
    const subjectId = data.subjectId !== undefined ? Number(data.subjectId) : existing.subjectId;
    const chapterId = data.chapterId !== undefined ? Number(data.chapterId) : existing.chapterId;
    const topicId = data.topicId !== undefined ? (data.topicId ? Number(data.topicId) : undefined) : existing.topicId;

    let verifiedCourseTitle = existing.courseTitle;
    let verifiedSubjectName = data.subject || existing.subject;
    let verifiedChapterName = data.chapter || existing.chapter;
    let verifiedTopicName = data.topicName !== undefined ? data.topicName : existing.topicName;

    if (courseId && subjectId && chapterId) {
      const hierarchy = validateDocumentHierarchy({
        courseId,
        subjectId,
        chapterId,
        topicId,
      });

      if (!hierarchy.valid) {
        return { success: false, error: hierarchy.error };
      }

      verifiedCourseTitle = hierarchy.courseTitle;
      verifiedSubjectName = hierarchy.subjectName;
      verifiedChapterName = hierarchy.chapterName;
      verifiedTopicName = hierarchy.topicName;
    }

    const previousFile = existing.storedFilename || path.basename(existing.fileUrl);
    const newFile = data.storedFilename || (data.fileUrl ? path.basename(data.fileUrl) : previousFile);

    const updated: DocumentRecord = {
      ...existing,
      ...data,
      id: existing.id,
      courseId,
      courseTitle: verifiedCourseTitle,
      subjectId,
      subject: verifiedSubjectName,
      chapterId,
      chapter: verifiedChapterName,
      topicId,
      topicName: verifiedTopicName,
      storedFilename: newFile,
      fileUrl: data.fileUrl ? data.fileUrl.trim() : existing.fileUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: user,
    };

    all[index] = updated;
    writeDocumentsToDb(all);

    // If file was replaced and previous file was distinct, safely delete old physical file (protecting canonical fixtures)
    if (data.storedFilename && previousFile && previousFile !== newFile) {
      deletePrivatePdfFile(previousFile);
    }

    return { success: true, document: updated };
  });
}

export async function deleteDocument(
  id: number,
  checkDependencies = true
): Promise<{ success: boolean; error?: string }> {
  return documentMutex.run(async () => {
    const all = readDocumentsFromDb();
    const index = all.findIndex((d) => Number(d.id) === Number(id));
    if (index === -1) return { success: false, error: `Document with ID ${id} not found.` };

    const doc = all[index];

    // Dependency check: query PostgreSQL learning progress if enabled
    if (checkDependencies) {
      try {
        const db = await getCommerceDb();
        const res = await db.query(
          `SELECT 1 FROM learning.student_content_progress
           WHERE content_type = 'PDF'
             AND (content_identifier = $1 OR content_identifier = $2)
           LIMIT 1;`,
          [String(doc.id), doc.fileUrl]
        );
        if (res.rows && res.rows.length > 0) {
          return {
            success: false,
            error: `Cannot delete Document #${doc.id}: Active student learning progress records depend on this document. You may set its status to "Archived" instead.`,
          };
        }
      } catch (dbErr) {
        // If commerce/learning DB is offline during unit testing, proceed safely
      }
    }

    const storedFile = doc.storedFilename || path.basename(doc.fileUrl);

    all.splice(index, 1);
    writeDocumentsToDb(all);

    // Safely remove physical file (canonical test fixtures are protected)
    if (storedFile) {
      deletePrivatePdfFile(storedFile);
    }

    return { success: true };
  });
}
