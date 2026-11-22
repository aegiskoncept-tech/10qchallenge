import fs from 'fs';
import path from 'path';
import { getCommerceDb } from '@/lib/commerce/db';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';
import {
  DoubtRecord,
  DoubtReply,
  DoubtStatus,
  DoubtSummaryMetrics,
  DoubtAssignmentHistory,
  ReplyVisibility,
  DoubtAttachmentItem,
} from './types';

function getDoubtDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir
      ? [
          path.join(persistentDir, 'data', 'doubts.json'),
          path.join(persistentDir, 'doubts.json'),
        ]
      : []),
    path.join(cwd, 'data', 'doubts.json'),
    path.join(cwd, 'frontend', 'data', 'doubts.json'),
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
    const fallback = path.join(cwd, 'data', 'doubts.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

function syncToFile(doubts: any[]): void {
  const json = JSON.stringify(doubts, null, 2);
  const paths = getDoubtDataPaths();
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, json, 'utf-8');
    } catch {}
  }
}

export class DoubtService {
  /**
   * Creates a new academic doubt from classroom or student dashboard.
   */
  static async createDoubt(
    userId: number,
    userDetails: { fullName: string; email?: string },
    payload: {
      courseId: number;
      title: string;
      description?: string;
      queryText?: string;
      subjectId?: number;
      chapterId?: number;
      topicId?: number;
      lessonId?: number;
      lessonTitle?: string;
      videoTimestampMinutes?: string;
      documentId?: number;
      attachments?: DoubtAttachmentItem[];
    }
  ): Promise<{ success: boolean; doubt?: DoubtRecord; error?: string }> {
    const courseId = Number(payload.courseId);
    if (isNaN(courseId) || courseId <= 0) {
      return { success: false, error: 'Valid Course ID is required.' };
    }

    const courses = AcademicHierarchyValidator.getCourses();
    const course = courses.find((c) => Number(c.id) === courseId);
    if (!course) {
      return { success: false, error: `Course #${courseId} does not exist.` };
    }

    const title = (payload.title || '').trim();
    const description = (payload.description || payload.queryText || '').trim();

    if (!title || title.length < 3) {
      return { success: false, error: 'Doubt title is required (minimum 3 characters).' };
    }
    if (title.length > 255) {
      return { success: false, error: 'Doubt title cannot exceed 255 characters.' };
    }
    if (!description || description.length < 5) {
      return { success: false, error: 'Doubt question description is required (minimum 5 characters).' };
    }
    if (description.length > 10000) {
      return { success: false, error: 'Doubt question cannot exceed 10,000 characters.' };
    }

    // Resolve academic hierarchy names
    const subjects = AcademicHierarchyValidator.getSubjects();
    const chapters = AcademicHierarchyValidator.getChapters();
    const topics = AcademicHierarchyValidator.getTopics();

    let subjectName = 'General';
    let chapterName = null;
    let topicName = null;

    if (payload.subjectId) {
      const s = subjects.find((sub) => Number(sub.id) === Number(payload.subjectId));
      if (s) subjectName = s.subjectName;
    }
    if (payload.chapterId) {
      const ch = chapters.find((chap) => Number(chap.id) === Number(payload.chapterId));
      if (ch) {
        chapterName = ch.chapterName;
        if (!payload.subjectId && ch.subjectId) {
          const s = subjects.find((sub) => Number(sub.id) === Number(ch.subjectId));
          if (s) subjectName = s.subjectName;
        }
      }
    }
    if (payload.topicId) {
      const top = topics.find((t) => Number(t.id) === Number(payload.topicId));
      if (top) topicName = top.topicName;
    }

    const db = await getCommerceDb();
    const res = await db.query(
      `INSERT INTO learning.student_doubts (
        student_id, student_name, student_email,
        course_id, course_title,
        subject_id, subject_name,
        chapter_id, chapter_name,
        topic_id, topic_name,
        lesson_id, lesson_title,
        video_timestamp_minutes, document_id,
        title, description,
        status, priority,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3,
        $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12, $13,
        $14, $15,
        $16, $17,
        'OPEN', 'NORMAL',
        NOW(), NOW()
      ) RETURNING *;`,
      [
        userId,
        userDetails.fullName || 'Student',
        userDetails.email || null,
        courseId,
        course.title,
        payload.subjectId || null,
        subjectName,
        payload.chapterId || null,
        chapterName,
        payload.topicId || null,
        topicName,
        payload.lessonId || null,
        payload.lessonTitle || null,
        payload.videoTimestampMinutes || null,
        payload.documentId || null,
        title,
        description,
      ]
    );

    const row = res.rows[0];
    const createdDoubt = this.mapDoubtRow(row);

    // If attachments were submitted with initial doubt, record initial student reply
    if (payload.attachments && payload.attachments.length > 0) {
      await db.query(
        `INSERT INTO learning.doubt_replies (
          doubt_id, author_id, author_name, author_role,
          message, visibility, attachments, created_at, updated_at
        ) VALUES ($1, $2, $3, 'STUDENT', $4, 'STUDENT_VISIBLE', $5, NOW(), NOW());`,
        [
          createdDoubt.id,
          userId,
          userDetails.fullName || 'Student',
          'Initial question attachment(s)',
          JSON.stringify(payload.attachments),
        ]
      );
    }

    // Mirror to legacy file store
    try {
      const allRes = await db.query(
        `SELECT id, student_id, student_name, student_email, course_id, course_title,
                lesson_title, subject_name, title, description, video_timestamp_minutes,
                status, assigned_faculty_name, created_at, resolved_at
         FROM learning.student_doubts ORDER BY id ASC;`
      );
      const legacyList = allRes.rows.map((r: any) => ({
        id: Number(r.id),
        studentId: Number(r.student_id),
        studentName: r.student_name,
        studentEmail: r.student_email,
        courseId: Number(r.course_id),
        courseTitle: r.course_title,
        lessonTitle: r.lesson_title,
        subject: r.subject_name,
        queryText: r.description,
        timestampMinutes: r.video_timestamp_minutes,
        status: r.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING',
        facultyName: r.assigned_faculty_name,
        createdAt: r.created_at,
        solvedAt: r.resolved_at,
      }));
      syncToFile(legacyList);
    } catch {}

    return { success: true, doubt: createdDoubt };
  }

  /**
   * Retrieves all doubts owned by a student with optional status/search filters.
   */
  static async getStudentDoubts(
    userId: number,
    filters?: { status?: string; courseId?: number; search?: string }
  ): Promise<DoubtRecord[]> {
    const db = await getCommerceDb();
    let sql = `
      SELECT d.*,
             COUNT(r.id) FILTER (WHERE r.visibility = 'STUDENT_VISIBLE') AS reply_count,
             MAX(r.created_at) FILTER (WHERE r.visibility = 'STUDENT_VISIBLE') AS last_reply_at
      FROM learning.student_doubts d
      LEFT JOIN learning.doubt_replies r ON r.doubt_id = d.id
      WHERE d.student_id = $1
    `;
    const params: any[] = [userId];

    if (filters?.status && filters.status !== 'ALL') {
      params.push(filters.status.toUpperCase());
      sql += ` AND d.status = $${params.length}`;
    }
    if (filters?.courseId) {
      params.push(Number(filters.courseId));
      sql += ` AND d.course_id = $${params.length}`;
    }
    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      sql += ` AND (d.title ILIKE $${params.length} OR d.description ILIKE $${params.length} OR d.course_title ILIKE $${params.length})`;
    }

    sql += ` GROUP BY d.id ORDER BY d.created_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map((r: any) => this.mapDoubtRow(r));
  }

  /**
   * Aggregates summary counts for student doubts.
   */
  static async getStudentMetrics(userId: number): Promise<DoubtSummaryMetrics> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'OPEN') AS open,
        COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS')) AS in_progress,
        COUNT(*) FILTER (WHERE status = 'ANSWERED') AS answered,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved,
        COUNT(*) FILTER (WHERE status = 'REOPENED') AS reopened
       FROM learning.student_doubts
       WHERE student_id = $1;`,
      [userId]
    );
    const row = res.rows[0] || {};
    return {
      total: Number(row.total || 0),
      open: Number(row.open || 0),
      inProgress: Number(row.in_progress || 0),
      answered: Number(row.answered || 0),
      resolved: Number(row.resolved || 0),
      reopened: Number(row.reopened || 0),
    };
  }

  /**
   * Retrieves full doubt detail for a student, strictly excluding any internal notes.
   */
  static async getStudentDoubtDetail(
    userId: number,
    doubtId: number
  ): Promise<{ success: boolean; doubt?: DoubtRecord; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM learning.student_doubts WHERE id = $1;`,
      [doubtId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Doubt not found.', status: 404 };
    }

    const row = res.rows[0];
    if (Number(row.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You do not have permission to view this doubt.', status: 403 };
    }

    // Retrieve only STUDENT_VISIBLE replies
    const replyRes = await db.query(
      `SELECT id, doubt_id, author_id, author_name, author_role, message, visibility, attachments, created_at, updated_at
       FROM learning.doubt_replies
       WHERE doubt_id = $1 AND visibility = 'STUDENT_VISIBLE'
       ORDER BY created_at ASC;`,
      [doubtId]
    );

    const doubt = this.mapDoubtRow(row);
    doubt.replies = replyRes.rows.map((r: any) => this.mapReplyRow(r));
    doubt.replyCount = doubt.replies.length;
    return { success: true, doubt };
  }

  /**
   * Adds a reply from the student to their own doubt conversation.
   */
  static async addStudentReply(
    userId: number,
    userName: string,
    doubtId: number,
    message: string,
    attachments?: DoubtAttachmentItem[]
  ): Promise<{ success: boolean; reply?: DoubtReply; error?: string; status?: number }> {
    const text = (message || '').trim();
    if (!text && (!attachments || attachments.length === 0)) {
      return { success: false, error: 'Reply message cannot be empty.', status: 400 };
    }

    const db = await getCommerceDb();
    const doubtRes = await db.query(
      `SELECT id, student_id, status FROM learning.student_doubts WHERE id = $1;`,
      [doubtId]
    );

    if (doubtRes.rows.length === 0) {
      return { success: false, error: 'Doubt not found.', status: 404 };
    }

    const doubt = doubtRes.rows[0];
    if (Number(doubt.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You cannot reply to another student\'s doubt.', status: 403 };
    }

    // Insert reply
    const replyRes = await db.query(
      `INSERT INTO learning.doubt_replies (
        doubt_id, author_id, author_name, author_role,
        message, visibility, attachments, created_at, updated_at
      ) VALUES ($1, $2, $3, 'STUDENT', $4, 'STUDENT_VISIBLE', $5, NOW(), NOW())
      RETURNING *;`,
      [
        doubtId,
        userId,
        userName || 'Student',
        text,
        JSON.stringify(attachments || []),
      ]
    );

    // If doubt was ANSWERED, receiving student reply transitions it to IN_PROGRESS
    const nextStatus = doubt.status === 'ANSWERED' ? 'IN_PROGRESS' : doubt.status;
    await db.query(
      `UPDATE learning.student_doubts
       SET status = $1, updated_at = NOW()
       WHERE id = $2;`,
      [nextStatus, doubtId]
    );

    return { success: true, reply: this.mapReplyRow(replyRes.rows[0]) };
  }

  /**
   * Student action: Reopens an answered/resolved doubt.
   */
  static async reopenDoubt(
    userId: number,
    userName: string,
    doubtId: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT id, student_id, status FROM learning.student_doubts WHERE id = $1;`,
      [doubtId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Doubt not found.', status: 404 };
    }

    const doubt = res.rows[0];
    if (Number(doubt.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You cannot reopen another student\'s doubt.', status: 403 };
    }

    if (!['ANSWERED', 'RESOLVED'].includes(doubt.status)) {
      return {
        success: false,
        error: `Cannot reopen doubt with status "${doubt.status}". Only ANSWERED or RESOLVED doubts can be reopened.`,
        status: 400,
      };
    }

    await db.query(
      `UPDATE learning.student_doubts
       SET status = 'REOPENED', resolved_at = NULL, updated_at = NOW()
       WHERE id = $1;`,
      [doubtId]
    );

    // Add note to conversation
    const msg = reason?.trim() ? `Doubt reopened by student: ${reason.trim()}` : 'Doubt reopened by student for further clarification.';
    await db.query(
      `INSERT INTO learning.doubt_replies (
        doubt_id, author_id, author_name, author_role,
        message, visibility, attachments, created_at, updated_at
      ) VALUES ($1, $2, $3, 'STUDENT', $4, 'STUDENT_VISIBLE', '[]'::jsonb, NOW(), NOW());`,
      [doubtId, userId, userName || 'Student', msg]
    );

    return { success: true };
  }

  /**
   * Student action: Resolves their own doubt.
   */
  static async resolveByStudent(
    userId: number,
    doubtId: number
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT id, student_id FROM learning.student_doubts WHERE id = $1;`,
      [doubtId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Doubt not found.', status: 404 };
    }

    const doubt = res.rows[0];
    if (Number(doubt.student_id) !== Number(userId)) {
      return { success: false, error: 'Forbidden: You cannot resolve another student\'s doubt.', status: 403 };
    }

    await db.query(
      `UPDATE learning.student_doubts
       SET status = 'RESOLVED', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1;`,
      [doubtId]
    );

    return { success: true };
  }

  // ============================================================================
  // ADMIN & FACULTY OPERATIONS
  // ============================================================================

  /**
   * Admin: Retrieves doubts across the entire platform with advanced filtering.
   */
  static async getAdminDoubts(filters?: {
    status?: string;
    courseId?: number;
    subjectId?: number;
    assignedFacultyId?: number;
    search?: string;
  }): Promise<{ list: DoubtRecord[]; metrics: DoubtSummaryMetrics }> {
    const db = await getCommerceDb();
    let sql = `
      SELECT d.*,
             COUNT(r.id) AS reply_count,
             MAX(r.created_at) AS last_reply_at
      FROM learning.student_doubts d
      LEFT JOIN learning.doubt_replies r ON r.doubt_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      params.push(filters.status.toUpperCase());
      sql += ` AND d.status = $${params.length}`;
    }
    if (filters?.courseId) {
      params.push(Number(filters.courseId));
      sql += ` AND d.course_id = $${params.length}`;
    }
    if (filters?.subjectId) {
      params.push(Number(filters.subjectId));
      sql += ` AND d.subject_id = $${params.length}`;
    }
    if (filters?.assignedFacultyId) {
      params.push(Number(filters.assignedFacultyId));
      sql += ` AND d.assigned_faculty_id = $${params.length}`;
    }
    if (filters?.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      sql += ` AND (
        d.title ILIKE $${params.length} OR
        d.description ILIKE $${params.length} OR
        d.student_name ILIKE $${params.length} OR
        d.student_email ILIKE $${params.length} OR
        d.course_title ILIKE $${params.length} OR
        CAST(d.id AS TEXT) = '${filters.search.trim()}'
      )`;
    }

    sql += ` GROUP BY d.id ORDER BY d.created_at DESC;`;

    const res = await db.query(sql, params);
    const list = res.rows.map((r: any) => this.mapDoubtRow(r));

    // Global admin metrics
    const metricsRes = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'OPEN') AS open,
        COUNT(*) FILTER (WHERE assigned_faculty_id IS NULL AND status IN ('OPEN', 'REOPENED')) AS unassigned,
        COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS')) AS in_progress,
        COUNT(*) FILTER (WHERE status = 'ANSWERED') AS answered,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved,
        COUNT(*) FILTER (WHERE status = 'REOPENED') AS reopened
      FROM learning.student_doubts;
    `);

    const m = metricsRes.rows[0] || {};
    const metrics: DoubtSummaryMetrics = {
      total: Number(m.total || 0),
      open: Number(m.open || 0),
      unassigned: Number(m.unassigned || 0),
      inProgress: Number(m.in_progress || 0),
      answered: Number(m.answered || 0),
      resolved: Number(m.resolved || 0),
      reopened: Number(m.reopened || 0),
    };

    return { list, metrics };
  }

  /**
   * Admin: Retrieves full doubt details including internal staff notes and assignments.
   */
  static async getAdminDoubtDetail(
    doubtId: number
  ): Promise<{ success: boolean; doubt?: DoubtRecord; assignments?: DoubtAssignmentHistory[]; error?: string }> {
    const db = await getCommerceDb();
    const res = await db.query(`SELECT * FROM learning.student_doubts WHERE id = $1;`, [doubtId]);

    if (res.rows.length === 0) {
      return { success: false, error: 'Doubt not found.' };
    }

    const row = res.rows[0];
    const doubt = this.mapDoubtRow(row);

    // Retrieve all replies (both STUDENT_VISIBLE and INTERNAL_NOTE)
    const replyRes = await db.query(
      `SELECT * FROM learning.doubt_replies WHERE doubt_id = $1 ORDER BY created_at ASC;`,
      [doubtId]
    );
    doubt.replies = replyRes.rows.map((r: any) => this.mapReplyRow(r));
    doubt.replyCount = doubt.replies.length;

    // Retrieve assignment history
    const assignRes = await db.query(
      `SELECT * FROM learning.doubt_assignments WHERE doubt_id = $1 ORDER BY created_at DESC;`,
      [doubtId]
    );
    const assignments: DoubtAssignmentHistory[] = assignRes.rows.map((a: any) => ({
      id: Number(a.id),
      doubtId: Number(a.doubt_id),
      previousFacultyId: a.previous_faculty_id ? Number(a.previous_faculty_id) : null,
      newFacultyId: Number(a.new_faculty_id),
      newFacultyName: a.new_faculty_name,
      assignedBy: Number(a.assigned_by),
      notes: a.notes,
      createdAt: new Date(a.created_at).toISOString(),
    }));

    return { success: true, doubt, assignments };
  }

  /**
   * Admin/Faculty: Adds reply to doubt (either public answer or internal staff note).
   */
  static async addAdminReply(
    authorId: number,
    authorDetails: { fullName: string; role: 'ADMIN' | 'FACULTY' },
    doubtId: number,
    message: string,
    visibility: ReplyVisibility = 'STUDENT_VISIBLE',
    attachments?: DoubtAttachmentItem[]
  ): Promise<{ success: boolean; reply?: DoubtReply; error?: string }> {
    const text = (message || '').trim();
    if (!text) {
      return { success: false, error: 'Message content is required.' };
    }

    const db = await getCommerceDb();
    const doubtRes = await db.query(`SELECT id, status FROM learning.student_doubts WHERE id = $1;`, [doubtId]);
    if (doubtRes.rows.length === 0) {
      return { success: false, error: 'Doubt not found.' };
    }

    const replyRes = await db.query(
      `INSERT INTO learning.doubt_replies (
        doubt_id, author_id, author_name, author_role,
        message, visibility, attachments, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;`,
      [
        doubtId,
        authorId,
        authorDetails.fullName || 'Academic Faculty',
        authorDetails.role || 'FACULTY',
        text,
        visibility,
        JSON.stringify(attachments || []),
      ]
    );

    // If student-visible reply, transition status to ANSWERED
    if (visibility === 'STUDENT_VISIBLE') {
      await db.query(
        `UPDATE learning.student_doubts
         SET status = 'ANSWERED',
             assigned_faculty_name = COALESCE(assigned_faculty_name, $1),
             updated_at = NOW()
         WHERE id = $2;`,
        [authorDetails.fullName || 'Academic Faculty', doubtId]
      );
    } else {
      await db.query(
        `UPDATE learning.student_doubts SET updated_at = NOW() WHERE id = $1;`,
        [doubtId]
      );
    }

    return { success: true, reply: this.mapReplyRow(replyRes.rows[0]) };
  }

  /**
   * Admin: Assigns doubt to a faculty member.
   */
  static async assignFaculty(
    adminId: number,
    doubtId: number,
    facultyId: number,
    facultyName: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = await getCommerceDb();
    const doubtRes = await db.query(`SELECT id, assigned_faculty_id, status FROM learning.student_doubts WHERE id = $1;`, [doubtId]);
    if (doubtRes.rows.length === 0) {
      return { success: false, error: 'Doubt not found.' };
    }

    const doubt = doubtRes.rows[0];
    const prevFacultyId = doubt.assigned_faculty_id ? Number(doubt.assigned_faculty_id) : null;
    const nextStatus = doubt.status === 'OPEN' ? 'ASSIGNED' : doubt.status;

    await db.query(
      `UPDATE learning.student_doubts
       SET assigned_faculty_id = $1,
           assigned_faculty_name = $2,
           assigned_at = NOW(),
           assigned_by = $3,
           status = $4,
           updated_at = NOW()
       WHERE id = $5;`,
      [facultyId, facultyName, adminId, nextStatus, doubtId]
    );

    await db.query(
      `INSERT INTO learning.doubt_assignments (
        doubt_id, previous_faculty_id, new_faculty_id, new_faculty_name, assigned_by, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
      [doubtId, prevFacultyId, facultyId, facultyName, adminId, notes || null]
    );

    return { success: true };
  }

  /**
   * Admin: Updates doubt status (e.g. to IN_PROGRESS, RESOLVED, REOPENED).
   */
  static async updateStatus(
    doubtId: number,
    newStatus: DoubtStatus
  ): Promise<{ success: boolean; error?: string }> {
    const validStatuses: DoubtStatus[] = [
      'OPEN',
      'ASSIGNED',
      'IN_PROGRESS',
      'ANSWERED',
      'RESOLVED',
      'REOPENED',
    ];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: `Invalid status "${newStatus}".` };
    }

    const db = await getCommerceDb();
    const resolvedAt = newStatus === 'RESOLVED' ? 'NOW()' : 'NULL';

    await db.query(
      `UPDATE learning.student_doubts
       SET status = $1,
           resolved_at = ${newStatus === 'RESOLVED' ? 'NOW()' : 'resolved_at'},
           updated_at = NOW()
       WHERE id = $2;`,
      [newStatus, doubtId]
    );

    return { success: true };
  }

  private static mapDoubtRow(r: any): DoubtRecord {
    return {
      id: Number(r.id),
      studentId: Number(r.student_id),
      studentName: r.student_name,
      studentEmail: r.student_email || undefined,
      courseId: Number(r.course_id),
      courseTitle: r.course_title,
      subjectId: r.subject_id ? Number(r.subject_id) : null,
      subjectName: r.subject_name || null,
      chapterId: r.chapter_id ? Number(r.chapter_id) : null,
      chapterName: r.chapter_name || null,
      topicId: r.topic_id ? Number(r.topic_id) : null,
      topicName: r.topic_name || null,
      lessonId: r.lesson_id ? Number(r.lesson_id) : null,
      lessonTitle: r.lesson_title || null,
      videoTimestampMinutes: r.video_timestamp_minutes || null,
      documentId: r.document_id ? Number(r.document_id) : null,
      title: r.title,
      description: r.description,
      status: r.status as DoubtStatus,
      priority: (r.priority || 'NORMAL') as any,
      assignedFacultyId: r.assigned_faculty_id ? Number(r.assigned_faculty_id) : null,
      assignedFacultyName: r.assigned_faculty_name || null,
      assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : null,
      assignedBy: r.assigned_by ? Number(r.assigned_by) : null,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      replyCount: r.reply_count !== undefined ? Number(r.reply_count) : undefined,
      lastReplyAt: r.last_reply_at ? new Date(r.last_reply_at).toISOString() : null,
    };
  }

  private static mapReplyRow(r: any): DoubtReply {
    let attachments: DoubtAttachmentItem[] = [];
    if (r.attachments) {
      if (typeof r.attachments === 'string') {
        try {
          attachments = JSON.parse(r.attachments);
        } catch {}
      } else if (Array.isArray(r.attachments)) {
        attachments = r.attachments;
      }
    }
    return {
      id: Number(r.id),
      doubtId: Number(r.doubt_id),
      authorId: Number(r.author_id),
      authorName: r.author_name,
      authorRole: r.author_role,
      message: r.message,
      visibility: r.visibility as ReplyVisibility,
      attachments,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }
}
