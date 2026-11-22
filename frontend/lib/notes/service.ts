import { getCommerceDb } from '@/lib/commerce/db';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';
import { StudentNoteRecord, NotesSummaryMetrics } from './types';

function extractPlainText(htmlOrMarkdown: string): string {
  if (!htmlOrMarkdown) return '';
  const text = htmlOrMarkdown
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Strip markdown links
    .replace(/[#*_`~>-]/g, '') // Strip markdown formatting
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 180);
}

export class StudentNotesService {
  /**
   * Creates a private interactive learning note.
   */
  static async createNote(
    userId: number,
    payload: {
      title: string;
      content: string;
      courseId?: number;
      subjectId?: number;
      chapterId?: number;
      topicId?: number;
      videoId?: number;
      videoTitle?: string;
      documentId?: number;
      documentTitle?: string;
      tags?: string[];
      isPinned?: boolean;
    }
  ): Promise<{ success: boolean; note?: StudentNoteRecord; error?: string }> {
    const title = (payload.title || '').trim();
    const content = (payload.content || '').trim();

    if (!title) {
      return { success: false, error: 'Note title is required.' };
    }
    if (title.length > 255) {
      return { success: false, error: 'Note title cannot exceed 255 characters.' };
    }

    // Resolve academic context names
    let courseTitle = null;
    let subjectName = null;
    let chapterName = null;
    let topicName = null;

    if (payload.courseId) {
      const courses = AcademicHierarchyValidator.getCourses();
      const c = courses.find((crs) => Number(crs.id) === Number(payload.courseId));
      if (c) courseTitle = c.title;
    }
    if (payload.subjectId) {
      const subjects = AcademicHierarchyValidator.getSubjects();
      const s = subjects.find((sub) => Number(sub.id) === Number(payload.subjectId));
      if (s) subjectName = s.subjectName;
    }
    if (payload.chapterId) {
      const chapters = AcademicHierarchyValidator.getChapters();
      const ch = chapters.find((chap) => Number(chap.id) === Number(payload.chapterId));
      if (ch) chapterName = ch.chapterName;
    }
    if (payload.topicId) {
      const topics = AcademicHierarchyValidator.getTopics();
      const top = topics.find((t) => Number(t.id) === Number(payload.topicId));
      if (top) topicName = top.topicName;
    }

    const plainText = extractPlainText(content);
    const tags = Array.isArray(payload.tags) ? payload.tags : [];
    const isPinned = Boolean(payload.isPinned);

    const db = await getCommerceDb();
    const res = await db.query(
      `INSERT INTO learning.student_notes (
        student_id,
        course_id, course_title,
        subject_id, subject_name,
        chapter_id, chapter_name,
        topic_id, topic_name,
        video_id, video_title,
        document_id, document_title,
        title, content, plain_text_preview,
        tags, is_pinned, version,
        created_at, updated_at
      ) VALUES (
        $1,
        $2, $3,
        $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12, $13,
        $14, $15, $16,
        $17, $18, 1,
        NOW(), NOW()
      ) RETURNING *;`,
      [
        userId,
        payload.courseId || null,
        courseTitle,
        payload.subjectId || null,
        subjectName,
        payload.chapterId || null,
        chapterName,
        payload.topicId || null,
        topicName,
        payload.videoId || null,
        payload.videoTitle || null,
        payload.documentId || null,
        payload.documentTitle || null,
        title,
        content,
        plainText,
        JSON.stringify(tags),
        isPinned,
      ]
    );

    return { success: true, note: this.mapNoteRow(res.rows[0]) };
  }

  /**
   * Retrieves all notes owned by the student, with optional search and filters.
   */
  static async getStudentNotes(
    userId: number,
    filters?: {
      courseId?: number;
      subjectId?: number;
      chapterId?: number;
      topicId?: number;
      videoId?: number;
      documentId?: number;
      isPinned?: boolean;
      search?: string;
    }
  ): Promise<StudentNoteRecord[]> {
    const db = await getCommerceDb();
    let sql = `
      SELECT * FROM learning.student_notes
      WHERE student_id = $1 AND archived_at IS NULL
    `;
    const params: any[] = [userId];

    if (filters?.courseId) {
      params.push(Number(filters.courseId));
      sql += ` AND course_id = $${params.length}`;
    }
    if (filters?.subjectId) {
      params.push(Number(filters.subjectId));
      sql += ` AND subject_id = $${params.length}`;
    }
    if (filters?.chapterId) {
      params.push(Number(filters.chapterId));
      sql += ` AND chapter_id = $${params.length}`;
    }
    if (filters?.topicId) {
      params.push(Number(filters.topicId));
      sql += ` AND topic_id = $${params.length}`;
    }
    if (filters?.videoId) {
      params.push(Number(filters.videoId));
      sql += ` AND video_id = $${params.length}`;
    }
    if (filters?.documentId) {
      params.push(Number(filters.documentId));
      sql += ` AND document_id = $${params.length}`;
    }
    if (filters?.isPinned !== undefined) {
      params.push(Boolean(filters.isPinned));
      sql += ` AND is_pinned = $${params.length}`;
    }
    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      sql += ` AND (
        title ILIKE $${params.length} OR
        plain_text_preview ILIKE $${params.length} OR
        course_title ILIKE $${params.length} OR
        subject_name ILIKE $${params.length} OR
        topic_name ILIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY is_pinned DESC, updated_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map((r: any) => this.mapNoteRow(r));
  }

  /**
   * Retrieves single note by ID with strict ownership validation.
   */
  static async getNoteById(
    userId: number,
    noteId: number
  ): Promise<{ success: boolean; note?: StudentNoteRecord; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM learning.student_notes WHERE id = $1 AND archived_at IS NULL;`,
      [noteId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Note not found.', status: 404 };
    }

    const note = res.rows[0];
    if (Number(note.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You do not own this note.', status: 403 };
    }

    return { success: true, note: this.mapNoteRow(note) };
  }

  /**
   * Updates note with optimistic concurrency control.
   */
  static async updateNote(
    userId: number,
    noteId: number,
    payload: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      expectedVersion?: number;
    }
  ): Promise<{ success: boolean; note?: StudentNoteRecord; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const currentRes = await db.query(
      `SELECT * FROM learning.student_notes WHERE id = $1 AND archived_at IS NULL;`,
      [noteId]
    );

    if (currentRes.rows.length === 0) {
      return { success: false, error: 'Note not found.', status: 404 };
    }

    const current = currentRes.rows[0];
    if (Number(current.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You do not own this note.', status: 403 };
    }

    // Optimistic concurrency check
    if (payload.expectedVersion !== undefined && Number(payload.expectedVersion) !== Number(current.version)) {
      return {
        success: false,
        error: 'Version conflict: This note was updated from another tab or device. Please refresh to load the latest version.',
        status: 409,
      };
    }

    const newTitle = payload.title !== undefined ? payload.title.trim() : current.title;
    if (!newTitle) {
      return { success: false, error: 'Note title cannot be empty.', status: 400 };
    }

    const newContent = payload.content !== undefined ? payload.content : current.content;
    const newPreview = extractPlainText(newContent);
    const newTags = payload.tags !== undefined ? JSON.stringify(payload.tags) : current.tags;
    const newPinned = payload.isPinned !== undefined ? payload.isPinned : current.is_pinned;
    const nextVersion = Number(current.version) + 1;

    const res = await db.query(
      `UPDATE learning.student_notes
       SET title = $1,
           content = $2,
           plain_text_preview = $3,
           tags = $4,
           is_pinned = $5,
           version = $6,
           updated_at = NOW()
       WHERE id = $7 AND student_id = $8
       RETURNING *;`,
      [newTitle, newContent, newPreview, newTags, newPinned, nextVersion, noteId, userId]
    );

    return { success: true, note: this.mapNoteRow(res.rows[0]) };
  }

  /**
   * Toggles pinned state of a note.
   */
  static async togglePin(
    userId: number,
    noteId: number
  ): Promise<{ success: boolean; isPinned?: boolean; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const currentRes = await db.query(
      `SELECT id, student_id, is_pinned FROM learning.student_notes WHERE id = $1 AND archived_at IS NULL;`,
      [noteId]
    );

    if (currentRes.rows.length === 0) {
      return { success: false, error: 'Note not found.', status: 404 };
    }

    const current = currentRes.rows[0];
    if (Number(current.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You do not own this note.', status: 403 };
    }

    const nextPinned = !current.is_pinned;
    await db.query(
      `UPDATE learning.student_notes
       SET is_pinned = $1, updated_at = NOW()
       WHERE id = $2 AND student_id = $3;`,
      [nextPinned, noteId, userId]
    );

    return { success: true, isPinned: nextPinned };
  }

  /**
   * Deletes a note permanently.
   */
  static async deleteNote(
    userId: number,
    noteId: number
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const currentRes = await db.query(
      `SELECT id, student_id FROM learning.student_notes WHERE id = $1 AND archived_at IS NULL;`,
      [noteId]
    );

    if (currentRes.rows.length === 0) {
      return { success: false, error: 'Note not found.', status: 404 };
    }

    const current = currentRes.rows[0];
    if (Number(current.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You do not own this note.', status: 403 };
    }

    await db.query(
      `DELETE FROM learning.student_notes WHERE id = $1 AND student_id = $2;`,
      [noteId, userId]
    );

    return { success: true };
  }

  /**
   * Aggregates summary statistics for notes (total, pinned, course count, recent notes).
   */
  static async getNotesMetrics(userId: number): Promise<NotesSummaryMetrics> {
    const db = await getCommerceDb();
    const countRes = await db.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_pinned = TRUE) AS pinned,
        COUNT(DISTINCT course_id) AS course_count
       FROM learning.student_notes
       WHERE student_id = $1 AND archived_at IS NULL;`,
      [userId]
    );

    const recentRes = await db.query(
      `SELECT * FROM learning.student_notes
       WHERE student_id = $1 AND archived_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 5;`,
      [userId]
    );

    const c = countRes.rows[0] || {};
    return {
      total: Number(c.total || 0),
      pinned: Number(c.pinned || 0),
      courseCount: Number(c.course_count || 0),
      recentNotes: recentRes.rows.map((r: any) => this.mapNoteRow(r)),
    };
  }

  private static mapNoteRow(r: any): StudentNoteRecord {
    let tags: string[] = [];
    if (r.tags) {
      if (typeof r.tags === 'string') {
        try {
          tags = JSON.parse(r.tags);
        } catch {}
      } else if (Array.isArray(r.tags)) {
        tags = r.tags;
      }
    }
    return {
      id: Number(r.id),
      studentId: Number(r.student_id),
      courseId: r.course_id ? Number(r.course_id) : null,
      courseTitle: r.course_title || null,
      subjectId: r.subject_id ? Number(r.subject_id) : null,
      subjectName: r.subject_name || null,
      chapterId: r.chapter_id ? Number(r.chapter_id) : null,
      chapterName: r.chapter_name || null,
      topicId: r.topic_id ? Number(r.topic_id) : null,
      topicName: r.topic_name || null,
      videoId: r.video_id ? Number(r.video_id) : null,
      videoTitle: r.video_title || null,
      documentId: r.document_id ? Number(r.document_id) : null,
      documentTitle: r.document_title || null,
      title: r.title,
      content: r.content,
      plainTextPreview: r.plain_text_preview || '',
      tags,
      isPinned: Boolean(r.is_pinned),
      version: Number(r.version || 1),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      archivedAt: r.archived_at ? new Date(r.archived_at).toISOString() : null,
    };
  }
}
