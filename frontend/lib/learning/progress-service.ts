// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 LEARNING PROGRESS SERVICE LAYER
// Authoritative PostgreSQL 16 Progress Storage, Hierarchy Validation,
// Event Ledger Persistence, and Safe Server-Side Progress Aggregation
// ==============================================================================

import { getCommerceDb } from '../commerce/db';
import { AcademicHierarchyValidator } from './validation';
import { readVideosFromDb } from '../db/videos';
import { readDocumentsFromDb } from '../db/documents';
import {
  ProgressMutationStatus,
  LearningContentType,
  ContentProgressStatus,
  LearningEventType,
  TopicProgressStatus,
  StudentTopicProgressRecord,
  StudentContentProgressRecord,
  StudentLearningEventRecord,
  StudentCourseActivityRecord,
  TopicProgressItem,
  ChapterProgressSummary,
  SubjectProgressSummary,
  CourseProgressSummary,
  CourseSummaryItem,
  StudentOverallSummary,
  SanitizedClassroomVideo,
  SanitizedClassroomDocument,
  ClassroomChapter,
  ClassroomSubject,
  ClassroomCurriculumData,
} from './types';

export class LearningProgressService {
  /**
   * Verifies whether a student has an active, settled enrollment for a specific course.
   * Only 'SETTLED' settlement_status with access_state in ('ACTIVE', 'PROVISIONED') qualify.
   * Revoked, expired, pending, or unverified records strictly do NOT qualify.
   */
  static async isStudentEligibleForCourse(userId: number, courseId: number): Promise<boolean> {
    const numericUserId = Number(userId);
    const numericCourseId = Number(courseId);

    if (isNaN(numericUserId) || numericUserId <= 0 || isNaN(numericCourseId) || numericCourseId <= 0) {
      return false;
    }

    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT 1 FROM commerce.enrollments
       WHERE user_id = $1
         AND course_id = $2
         AND settlement_status = 'SETTLED'
         AND access_state IN ('ACTIVE', 'PROVISIONED')
       LIMIT 1;`,
      [numericUserId, String(numericCourseId)]
    );

    return res.rows.length > 0;
  }

  /**
   * Retrieves all canonical course IDs for which the student holds an active, settled enrollment.
   */
  static async getStudentEligibleCourseIds(userId: number): Promise<number[]> {
    const numericUserId = Number(userId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return [];
    }

    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT DISTINCT course_id FROM commerce.enrollments
       WHERE user_id = $1
         AND settlement_status = 'SETTLED'
         AND access_state IN ('ACTIVE', 'PROVISIONED');`,
      [numericUserId]
    );

    return res.rows
      .map((r: any) => parseInt(r.course_id, 10))
      .filter((id: number) => !isNaN(id) && id > 0);
  }

  /**
   * Records or updates a student's progress for a specific topic.
   * Validates the complete canonical academic hierarchy before writing.
   * Uses a database transaction for atomic progress, event, and activity updates.
   * Strictly prevents downgrading COMPLETED to IN_PROGRESS.
   * Guarantees idempotency for repeated completion requests.
   */
  static async recordTopicProgress(params: {
    userId: number;
    courseId: number;
    topicId: number;
    status: ProgressMutationStatus;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
    skipEnrollmentCheck?: boolean;
  }): Promise<{
    success: boolean;
    record: StudentTopicProgressRecord;
    eventRecorded: boolean;
  }> {
    const { userId, courseId, topicId, status, idempotencyKey, metadata, skipEnrollmentCheck } = params;

    const numericUserId = Number(userId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      throw new Error(`Invalid user ID: ${userId}`);
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be IN_PROGRESS or COMPLETED.`);
    }

    // 0. Server-side enrollment authorization guard unless explicitly bypassed for internal tests
    if (!skipEnrollmentCheck) {
      const isEligible = await this.isStudentEligibleForCourse(numericUserId, courseId);
      if (!isEligible) {
        throw new Error('Forbidden: Student is not actively enrolled in this course.');
      }
    }

    // 1. Validate complete canonical academic hierarchy
    const verifiedHierarchy = AcademicHierarchyValidator.validateTopicHierarchy(courseId, topicId);
    const db = await getCommerceDb();
    const isCompleted = status === 'COMPLETED';

    return await db.transaction(async (tx) => {
      // 2. Query existing topic progress record within transaction
      const existingRes = await tx.query(
        `SELECT id, user_id, course_id, subject_id, chapter_id, topic_id,
                status, started_at, completed_at, last_activity_at, created_at, updated_at
         FROM learning.student_topic_progress
         WHERE user_id = $1 AND topic_id = $2;`,
        [numericUserId, verifiedHierarchy.topicId]
      );

      const existing = existingRes.rows[0];
      let record: StudentTopicProgressRecord;
      let shouldRecordEvent = false;
      const eventType: LearningEventType = isCompleted ? 'TOPIC_COMPLETED' : 'TOPIC_STARTED';

      if (existing) {
        const isAlreadyCompleted = existing.status === 'COMPLETED';

        // Guard against downgrading COMPLETED to IN_PROGRESS
        if (isAlreadyCompleted && !isCompleted) {
          // Stale IN_PROGRESS request cannot downgrade COMPLETED.
          // Update last_activity_at only, preserve status and completed_at
          const updateRes = await tx.query(
            `UPDATE learning.student_topic_progress
             SET last_activity_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND topic_id = $2
             RETURNING *;`,
            [numericUserId, verifiedHierarchy.topicId]
          );
          const row = updateRes.rows[0];
          record = {
            id: String(row.id),
            userId: Number(row.user_id),
            courseId: Number(row.course_id),
            subjectId: Number(row.subject_id),
            chapterId: Number(row.chapter_id),
            topicId: Number(row.topic_id),
            status: row.status as ProgressMutationStatus,
            startedAt: new Date(row.started_at).toISOString(),
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
            lastActivityAt: new Date(row.last_activity_at).toISOString(),
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          };
          shouldRecordEvent = false;
        } else if (isAlreadyCompleted && isCompleted) {
          // Idempotent completion call: already completed, preserve completed_at
          const updateRes = await tx.query(
            `UPDATE learning.student_topic_progress
             SET last_activity_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND topic_id = $2
             RETURNING *;`,
            [numericUserId, verifiedHierarchy.topicId]
          );
          const row = updateRes.rows[0];
          record = {
            id: String(row.id),
            userId: Number(row.user_id),
            courseId: Number(row.course_id),
            subjectId: Number(row.subject_id),
            chapterId: Number(row.chapter_id),
            topicId: Number(row.topic_id),
            status: row.status as ProgressMutationStatus,
            startedAt: new Date(row.started_at).toISOString(),
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
            lastActivityAt: new Date(row.last_activity_at).toISOString(),
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          };
          shouldRecordEvent = Boolean(idempotencyKey);
        } else {
          // Existing is IN_PROGRESS, new is COMPLETED or IN_PROGRESS
          const updateRes = await tx.query(
            `UPDATE learning.student_topic_progress
             SET status = $1,
                 completed_at = CASE WHEN $2 THEN NOW() ELSE completed_at END,
                 last_activity_at = NOW(),
                 updated_at = NOW()
             WHERE user_id = $3 AND topic_id = $4
             RETURNING *;`,
            [status, isCompleted, numericUserId, verifiedHierarchy.topicId]
          );
          const row = updateRes.rows[0];
          record = {
            id: String(row.id),
            userId: Number(row.user_id),
            courseId: Number(row.course_id),
            subjectId: Number(row.subject_id),
            chapterId: Number(row.chapter_id),
            topicId: Number(row.topic_id),
            status: row.status as ProgressMutationStatus,
            startedAt: new Date(row.started_at).toISOString(),
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
            lastActivityAt: new Date(row.last_activity_at).toISOString(),
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          };
          shouldRecordEvent = isCompleted || Boolean(idempotencyKey);
        }
      } else {
        // First-time progress insert
        const insertRes = await tx.query(
          `INSERT INTO learning.student_topic_progress (
            user_id, course_id, subject_id, chapter_id, topic_id,
            status, started_at, completed_at, last_activity_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, NOW(), CASE WHEN $7 THEN NOW() ELSE NULL END, NOW(), NOW()
          ) RETURNING *;`,
          [
            numericUserId,
            verifiedHierarchy.courseId,
            verifiedHierarchy.subjectId,
            verifiedHierarchy.chapterId,
            verifiedHierarchy.topicId,
            status,
            isCompleted,
          ]
        );
        const row = insertRes.rows[0];
        record = {
          id: String(row.id),
          userId: Number(row.user_id),
          courseId: Number(row.course_id),
          subjectId: Number(row.subject_id),
          chapterId: Number(row.chapter_id),
          topicId: Number(row.topic_id),
          status: row.status as ProgressMutationStatus,
          startedAt: new Date(row.started_at).toISOString(),
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
          lastActivityAt: new Date(row.last_activity_at).toISOString(),
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        };
        shouldRecordEvent = true;
      }

      // Record append-only learning event
      let eventRecorded = false;
      if (shouldRecordEvent) {
        try {
          const eventSql = `
            INSERT INTO learning.student_learning_events (
              user_id, course_id, event_type, subject_id, chapter_id, topic_id,
              event_at, idempotency_key, metadata
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW(), $7, $8
            )
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id;
          `;

          const eventRes = await tx.query(eventSql, [
            numericUserId,
            verifiedHierarchy.courseId,
            eventType,
            verifiedHierarchy.subjectId,
            verifiedHierarchy.chapterId,
            verifiedHierarchy.topicId,
            idempotencyKey || null,
            metadata ? JSON.stringify(metadata) : null,
          ]);

          eventRecorded = eventRes.rowCount > 0;
        } catch (eventErr) {
          console.error('[recordTopicProgress] Learning event record warning:', eventErr);
        }
      }

      // Update student course activity snapshot
      try {
        const activitySql = `
          INSERT INTO learning.student_course_activity (
            user_id, course_id, last_accessed_subject_id, last_accessed_chapter_id,
            last_accessed_topic_id, last_activity_at
          ) VALUES (
            $1, $2, $3, $4, $5, NOW()
          )
          ON CONFLICT (user_id, course_id) DO UPDATE SET
            last_accessed_subject_id = EXCLUDED.last_accessed_subject_id,
            last_accessed_chapter_id = EXCLUDED.last_accessed_chapter_id,
            last_accessed_topic_id = EXCLUDED.last_accessed_topic_id,
            last_activity_at = NOW();
        `;

        await tx.query(activitySql, [
          numericUserId,
          verifiedHierarchy.courseId,
          verifiedHierarchy.subjectId,
          verifiedHierarchy.chapterId,
          verifiedHierarchy.topicId,
        ]);
      } catch (actErr) {
        console.error('[recordTopicProgress] Course activity snapshot warning:', actErr);
      }

      return {
        success: true,
        record,
        eventRecorded,
      };
    });
  }

  /**
   * Records or updates a student's content-level progress (Vimeo video or PDF document).
   * Validates canonical master existence and course/chapter linkage.
   * Strictly prevents downgrading COMPLETED to IN_PROGRESS.
   * Uses database transactions.
   */
  static async recordContentProgress(params: {
    userId: number;
    courseId: number;
    contentType: LearningContentType;
    contentIdentifier: string;
    status: ContentProgressStatus;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
    skipEnrollmentCheck?: boolean;
  }): Promise<{
    success: boolean;
    record: StudentContentProgressRecord;
    eventRecorded: boolean;
  }> {
    const { userId, courseId, contentType, contentIdentifier, status, idempotencyKey, metadata, skipEnrollmentCheck } = params;

    const numericUserId = Number(userId);
    const numericCourseId = Number(courseId);

    if (isNaN(numericUserId) || numericUserId <= 0) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    if (isNaN(numericCourseId) || numericCourseId <= 0) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }
    if (!['VIDEO', 'PDF'].includes(contentType)) {
      throw new Error(`Invalid content type: ${contentType}. Must be VIDEO or PDF.`);
    }
    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be IN_PROGRESS or COMPLETED.`);
    }

    // 0. Server-side enrollment authorization guard unless explicitly bypassed
    if (!skipEnrollmentCheck) {
      const isEligible = await this.isStudentEligibleForCourse(numericUserId, numericCourseId);
      if (!isEligible) {
        throw new Error('Forbidden: Student is not actively enrolled in this course.');
      }
    }

    // Validate content against master and verify course/chapter hierarchy association
    const verifiedContent = AcademicHierarchyValidator.validateContentHierarchy(
      numericCourseId,
      contentType,
      contentIdentifier
    );

    const db = await getCommerceDb();
    const isCompleted = status === 'COMPLETED';

    return await db.transaction(async (tx) => {
      // Query existing content progress within transaction
      const existingRes = await tx.query(
        `SELECT id, user_id, course_id, content_type, content_identifier, status,
                last_activity_at, completed_at, created_at, updated_at
         FROM learning.student_content_progress
         WHERE user_id = $1 AND content_type = $2 AND content_identifier = $3;`,
        [numericUserId, contentType, verifiedContent.contentIdentifier]
      );

      const existing = existingRes.rows[0];
      let record: StudentContentProgressRecord;
      let shouldRecordEvent = false;

      let eventType: LearningEventType;
      if (contentType === 'VIDEO') {
        eventType = isCompleted ? 'VIDEO_COMPLETED' : 'VIDEO_STARTED';
      } else {
        eventType = isCompleted ? 'DOCUMENT_COMPLETED' : 'DOCUMENT_OPENED';
      }

      if (existing) {
        const isAlreadyCompleted = existing.status === 'COMPLETED';

        if (isAlreadyCompleted && !isCompleted) {
          // Prevent downgrade from COMPLETED to IN_PROGRESS
          const updateRes = await tx.query(
            `UPDATE learning.student_content_progress
             SET last_activity_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND content_type = $2 AND content_identifier = $3
             RETURNING *;`,
            [numericUserId, contentType, verifiedContent.contentIdentifier]
          );
          const row = updateRes.rows[0];
          record = {
            id: String(row.id),
            userId: Number(row.user_id),
            courseId: Number(row.course_id),
            contentType: row.content_type as LearningContentType,
            contentIdentifier: row.content_identifier,
            status: row.status as ContentProgressStatus,
            lastActivityAt: new Date(row.last_activity_at).toISOString(),
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          };
          shouldRecordEvent = false;
        } else if (isAlreadyCompleted && isCompleted) {
          // Idempotent completion
          const updateRes = await tx.query(
            `UPDATE learning.student_content_progress
             SET last_activity_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND content_type = $2 AND content_identifier = $3
             RETURNING *;`,
            [numericUserId, contentType, verifiedContent.contentIdentifier]
          );
          const row = updateRes.rows[0];
          record = {
            id: String(row.id),
            userId: Number(row.user_id),
            courseId: Number(row.course_id),
            contentType: row.content_type as LearningContentType,
            contentIdentifier: row.content_identifier,
            status: row.status as ContentProgressStatus,
            lastActivityAt: new Date(row.last_activity_at).toISOString(),
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          };
          shouldRecordEvent = Boolean(idempotencyKey);
        } else {
          // IN_PROGRESS -> COMPLETED or IN_PROGRESS
          const updateRes = await tx.query(
            `UPDATE learning.student_content_progress
             SET status = $1,
                 completed_at = CASE WHEN $2 THEN NOW() ELSE completed_at END,
                 last_activity_at = NOW(),
                 updated_at = NOW()
             WHERE user_id = $3 AND content_type = $4 AND content_identifier = $5
             RETURNING *;`,
            [status, isCompleted, numericUserId, contentType, verifiedContent.contentIdentifier]
          );
          const row = updateRes.rows[0];
          record = {
            id: String(row.id),
            userId: Number(row.user_id),
            courseId: Number(row.course_id),
            contentType: row.content_type as LearningContentType,
            contentIdentifier: row.content_identifier,
            status: row.status as ContentProgressStatus,
            lastActivityAt: new Date(row.last_activity_at).toISOString(),
            completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          };
          shouldRecordEvent = isCompleted || Boolean(idempotencyKey);
        }
      } else {
        // First-time content progress insert
        const insertRes = await tx.query(
          `INSERT INTO learning.student_content_progress (
            user_id, course_id, content_type, content_identifier, status,
            last_activity_at, completed_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, NOW(), CASE WHEN $6 THEN NOW() ELSE NULL END, NOW()
          ) RETURNING *;`,
          [
            numericUserId,
            numericCourseId,
            contentType,
            verifiedContent.contentIdentifier,
            status,
            isCompleted,
          ]
        );
        const row = insertRes.rows[0];
        record = {
          id: String(row.id),
          userId: Number(row.user_id),
          courseId: Number(row.course_id),
          contentType: row.content_type as LearningContentType,
          contentIdentifier: row.content_identifier,
          status: row.status as ContentProgressStatus,
          lastActivityAt: new Date(row.last_activity_at).toISOString(),
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        };
        shouldRecordEvent = true;
      }

      // Record learning event
      let eventRecorded = false;
      if (shouldRecordEvent) {
        try {
          const eventSql = `
            INSERT INTO learning.student_learning_events (
              user_id, course_id, event_type, content_type, content_identifier,
              subject_id, chapter_id, event_at, idempotency_key, metadata
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9
            )
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id;
          `;

          const eventRes = await tx.query(eventSql, [
            numericUserId,
            numericCourseId,
            eventType,
            contentType,
            verifiedContent.contentIdentifier,
            verifiedContent.subjectId,
            verifiedContent.chapterId,
            idempotencyKey || null,
            metadata ? JSON.stringify(metadata) : null,
          ]);

          eventRecorded = eventRes.rowCount > 0;
        } catch (eventErr) {
          console.error('[recordContentProgress] Event logging warning:', eventErr);
        }
      }

      return {
        success: true,
        record,
        eventRecorded,
      };
    });
  }

  /**
   * Retrieves raw topic progress records for a student and course
   */
  static async getStudentTopicProgress(
    userId: number,
    courseId: number
  ): Promise<StudentTopicProgressRecord[]> {
    const numericUserId = Number(userId);
    const numericCourseId = Number(courseId);

    if (isNaN(numericUserId) || isNaN(numericCourseId)) {
      return [];
    }

    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT id, user_id, course_id, subject_id, chapter_id, topic_id,
              status, started_at, completed_at, last_activity_at, created_at, updated_at
       FROM learning.student_topic_progress
       WHERE user_id = $1 AND course_id = $2
       ORDER BY last_activity_at DESC;`,
      [numericUserId, numericCourseId]
    );

    return res.rows.map((row) => ({
      id: String(row.id),
      userId: Number(row.user_id),
      courseId: Number(row.course_id),
      subjectId: Number(row.subject_id),
      chapterId: Number(row.chapter_id),
      topicId: Number(row.topic_id),
      status: row.status as ProgressMutationStatus,
      startedAt: new Date(row.started_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      lastActivityAt: new Date(row.last_activity_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  /**
   * Authoritative server-side progress calculation across the complete academic hierarchy.
   * Handles courses and chapters with zero eligible topics safely without NaN or division by zero.
   * Includes detailed topic-level items with NOT_STARTED status for unstarted topics.
   * Never fabricates progress data.
   */
  static async getStudentCourseProgressSummary(
    userId: number,
    courseId: number
  ): Promise<CourseProgressSummary> {
    const numericUserId = Number(userId);
    const numericCourseId = Number(courseId);

    const allCourses = AcademicHierarchyValidator.getCourses();
    const course = allCourses.find((c) => Number(c.id) === numericCourseId);
    const courseTitle = course ? course.title : `Course #${numericCourseId}`;
    const slug = course ? course.slug : String(numericCourseId);
    const examTag = (course as any)?.examTag || (course as any)?.targetExam || 'General';

    const allSubjects = AcademicHierarchyValidator.getSubjects();
    const allChapters = AcademicHierarchyValidator.getChapters();
    const courseChapters = allChapters.filter((ch) => Number(ch.courseId) === numericCourseId);
    const courseTopics = AcademicHierarchyValidator.getEligibleTopicsForCourse(numericCourseId);

    // Fetch all student's topic progress records for this course from PostgreSQL 16
    const db = await getCommerceDb();
    const topicProgressRes = await db.query(
      `SELECT topic_id, status, started_at, completed_at, last_activity_at
       FROM learning.student_topic_progress
       WHERE user_id = $1 AND course_id = $2;`,
      [numericUserId, numericCourseId]
    );

    const topicProgressMap = new Map<number, any>();
    const completedTopicIds = new Set<number>();

    for (const r of topicProgressRes.rows) {
      const tId = Number(r.topic_id);
      topicProgressMap.set(tId, r);
      if (r.status === 'COMPLETED') {
        completedTopicIds.add(tId);
      }
    }

    // Fetch latest activity timestamp & location snapshot
    const activityRes = await db.query(
      `SELECT last_accessed_subject_id, last_accessed_chapter_id,
              last_accessed_topic_id, last_activity_at
       FROM learning.student_course_activity
       WHERE user_id = $1 AND course_id = $2;`,
      [numericUserId, numericCourseId]
    );

    const actRow = activityRes.rows[0];
    const lastActivityAt = actRow?.last_activity_at
      ? new Date(actRow.last_activity_at).toISOString()
      : null;

    const lastAccessedLocation = actRow
      ? {
          subjectId: actRow.last_accessed_subject_id ? Number(actRow.last_accessed_subject_id) : null,
          chapterId: actRow.last_accessed_chapter_id ? Number(actRow.last_accessed_chapter_id) : null,
          topicId: actRow.last_accessed_topic_id ? Number(actRow.last_accessed_topic_id) : null,
          lastActivityAt,
        }
      : null;

    // Identify all distinct subjects involved in this course's chapters
    const courseSubjectIds = Array.from(new Set(courseChapters.map((ch) => Number(ch.subjectId))));
    const subjectSummaries: SubjectProgressSummary[] = [];

    let totalCourseTopics = 0;
    let completedCourseTopics = 0;
    let totalCourseChapters = 0;
    let completedCourseChapters = 0;
    let completedCourseSubjects = 0;

    for (const subId of courseSubjectIds) {
      const subject = allSubjects.find((s) => Number(s.id) === subId);
      const subjectName = subject ? subject.subjectName : `Subject #${subId}`;
      const subjectChapters = courseChapters.filter((ch) => Number(ch.subjectId) === subId);

      const chapterSummaries: ChapterProgressSummary[] = [];
      let totalSubjectTopics = 0;
      let completedSubjectTopics = 0;
      let completedSubjectChapters = 0;

      for (const chapter of subjectChapters) {
        totalCourseChapters++;
        const chapterTopics = courseTopics.filter((t) => Number(t.chapterId) === Number(chapter.id));
        const totalTopicsInChapter = chapterTopics.length;
        const completedTopicsInChapter = chapterTopics.filter((t) => completedTopicIds.has(Number(t.id))).length;

        totalSubjectTopics += totalTopicsInChapter;
        completedSubjectTopics += completedTopicsInChapter;

        // Zero-topic chapter handling: A chapter with 0 topics is NEVER completed automatically
        const isChapterCompleted = totalTopicsInChapter > 0 && completedTopicsInChapter === totalTopicsInChapter;
        const chapterPercentage =
          totalTopicsInChapter > 0
            ? Math.round((completedTopicsInChapter / totalTopicsInChapter) * 10000) / 100
            : 0.0;

        if (isChapterCompleted) {
          completedSubjectChapters++;
          completedCourseChapters++;
        }

        // Build granular topic items with authoritative NOT_STARTED for absent records
        const topicItems: TopicProgressItem[] = chapterTopics.map((topic) => {
          const prog = topicProgressMap.get(Number(topic.id));
          const topicStatus: TopicProgressStatus = prog
            ? (prog.status as TopicProgressStatus)
            : 'NOT_STARTED';

          return {
            topicId: Number(topic.id),
            topicName: topic.topicName,
            topicCode: (topic as any).topicCode,
            slug: topic.slug,
            displayOrder: (topic as any).displayOrder,
            status: topicStatus,
            startedAt: prog?.started_at ? new Date(prog.started_at).toISOString() : null,
            completedAt: prog?.completed_at ? new Date(prog.completed_at).toISOString() : null,
            lastActivityAt: prog?.last_activity_at ? new Date(prog.last_activity_at).toISOString() : null,
          };
        });

        chapterSummaries.push({
          chapterId: Number(chapter.id),
          chapterName: chapter.chapterName,
          totalTopics: totalTopicsInChapter,
          completedTopics: completedTopicsInChapter,
          remainingTopics: Math.max(0, totalTopicsInChapter - completedTopicsInChapter),
          completionPercentage: chapterPercentage,
          isCompleted: isChapterCompleted,
          topics: topicItems,
        });
      }

      totalCourseTopics += totalSubjectTopics;
      completedCourseTopics += completedSubjectTopics;

      // Subject completion requires all its chapters with topics to be completed
      const isSubjectCompleted =
        subjectChapters.length > 0 &&
        completedSubjectChapters === subjectChapters.filter((ch) => {
          const chTopics = courseTopics.filter((t) => Number(t.chapterId) === Number(ch.id));
          return chTopics.length > 0;
        }).length &&
        totalSubjectTopics > 0 &&
        completedSubjectTopics === totalSubjectTopics;

      if (isSubjectCompleted) {
        completedCourseSubjects++;
      }

      const subjectPercentage =
        totalSubjectTopics > 0
          ? Math.round((completedSubjectTopics / totalSubjectTopics) * 10000) / 100
          : 0.0;

      subjectSummaries.push({
        subjectId: subId,
        subjectName,
        totalChapters: subjectChapters.length,
        completedChapters: completedSubjectChapters,
        totalTopics: totalSubjectTopics,
        completedTopics: completedSubjectTopics,
        remainingTopics: Math.max(0, totalSubjectTopics - completedSubjectTopics),
        completionPercentage: subjectPercentage,
        isCompleted: isSubjectCompleted,
        chapters: chapterSummaries,
      });
    }

    // Course completion percentage: Completed Topics / Total Topics * 100
    const coursePercentage =
      totalCourseTopics > 0
        ? Math.round((completedCourseTopics / totalCourseTopics) * 10000) / 100
        : 0.0;

    return {
      courseId: numericCourseId,
      courseTitle,
      slug,
      examTag,
      totalSubjects: courseSubjectIds.length,
      completedSubjects: completedCourseSubjects,
      totalChapters: totalCourseChapters,
      completedChapters: completedCourseChapters,
      totalTopics: totalCourseTopics,
      completedTopics: completedCourseTopics,
      remainingTopics: Math.max(0, totalCourseTopics - completedCourseTopics),
      courseCompletionPercentage: coursePercentage,
      lastActivityAt,
      lastAccessedLocation,
      subjects: subjectSummaries,
    };
  }

  /**
   * Retrieves an overall learning summary across all eligible settled courses for a student.
   * If a student has no eligible settled enrollments, returns 0 courses and 0% completion.
   * Returns authentic 0% progress values for courses without activity.
   */
  static async getStudentOverallSummary(userId: number): Promise<StudentOverallSummary> {
    const numericUserId = Number(userId);
    const eligibleCourseIds = await this.getStudentEligibleCourseIds(numericUserId);
    const allCourses = AcademicHierarchyValidator.getCourses();
    const courses = allCourses.filter((c) => eligibleCourseIds.includes(Number(c.id)));

    const courseSummaries: CourseSummaryItem[] = [];
    let totalEligibleTopics = 0;
    let totalCompletedTopics = 0;
    let totalChapters = 0;
    let totalCompletedChapters = 0;
    let totalSubjects = 0;
    let totalCompletedSubjects = 0;
    let latestActivityAt: string | null = null;

    for (const course of courses) {
      const summary = await this.getStudentCourseProgressSummary(numericUserId, course.id);

      totalEligibleTopics += summary.totalTopics;
      totalCompletedTopics += summary.completedTopics;
      totalChapters += summary.totalChapters;
      totalCompletedChapters += summary.completedChapters;
      totalSubjects += summary.totalSubjects;
      totalCompletedSubjects += summary.completedSubjects;

      if (summary.lastActivityAt) {
        if (!latestActivityAt || new Date(summary.lastActivityAt) > new Date(latestActivityAt)) {
          latestActivityAt = summary.lastActivityAt;
        }
      }

      courseSummaries.push({
        courseId: summary.courseId,
        courseTitle: summary.courseTitle,
        slug: summary.slug || course.slug || String(course.id),
        examTag: summary.examTag || (course as any).examTag || 'General',
        totalSubjects: summary.totalSubjects,
        completedSubjects: summary.completedSubjects,
        totalChapters: summary.totalChapters,
        completedChapters: summary.completedChapters,
        totalTopics: summary.totalTopics,
        completedTopics: summary.completedTopics,
        remainingTopics: summary.remainingTopics,
        completionPercentage: summary.courseCompletionPercentage,
        lastActivityAt: summary.lastActivityAt,
      });
    }

    const averagePercentage =
      totalEligibleTopics > 0
        ? Math.round((totalCompletedTopics / totalEligibleTopics) * 10000) / 100
        : 0.0;

    const recentActivity = eligibleCourseIds.length > 0
      ? await this.getStudentLearningEvents(numericUserId, undefined, 5, eligibleCourseIds)
      : [];

    return {
      totalCourses: courses.length,
      overall: {
        totalEligibleTopics,
        completedTopics: totalCompletedTopics,
        remainingTopics: Math.max(0, totalEligibleTopics - totalCompletedTopics),
        totalChapters,
        completedChapters: totalCompletedChapters,
        totalSubjects,
        completedSubjects: totalCompletedSubjects,
        averageCompletionPercentage: averagePercentage,
        lastActivityAt: latestActivityAt,
      },
      courses: courseSummaries,
      recentActivity,
    };
  }

  /**
   * Retrieves the latest course activity snapshot for a student
   */
  static async getStudentCourseActivity(
    userId: number,
    courseId: number
  ): Promise<StudentCourseActivityRecord | null> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT user_id, course_id, last_accessed_subject_id, last_accessed_chapter_id,
              last_accessed_topic_id, last_activity_at
       FROM learning.student_course_activity
       WHERE user_id = $1 AND course_id = $2;`,
      [Number(userId), Number(courseId)]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      userId: Number(row.user_id),
      courseId: Number(row.course_id),
      lastAccessedSubjectId: row.last_accessed_subject_id ? Number(row.last_accessed_subject_id) : null,
      lastAccessedChapterId: row.last_accessed_chapter_id ? Number(row.last_accessed_chapter_id) : null,
      lastAccessedTopicId: row.last_accessed_topic_id ? Number(row.last_accessed_topic_id) : null,
      lastActivityAt: new Date(row.last_activity_at).toISOString(),
    };
  }

  /**
   * Retrieves historical learning events for audit and verification
   * Restricts results to eligible courses if provided or when scoping globally
   */
  static async getStudentLearningEvents(
    userId: number,
    courseId?: number,
    limit = 50,
    eligibleCourseIds?: number[]
  ): Promise<StudentLearningEventRecord[]> {
    const db = await getCommerceDb();
    let query = `
      SELECT id, user_id, course_id, event_type, content_type, content_identifier,
             subject_id, chapter_id, topic_id, event_at, idempotency_key, metadata
      FROM learning.student_learning_events
      WHERE user_id = $1
    `;
    const params: any[] = [Number(userId)];

    if (courseId) {
      params.push(Number(courseId));
      query += ` AND course_id = $2`;
    } else if (eligibleCourseIds !== undefined) {
      if (eligibleCourseIds.length === 0) {
        return [];
      }
      params.push(eligibleCourseIds);
      query += ` AND course_id = ANY($2)`;
    }

    query += ` ORDER BY event_at DESC LIMIT $${params.length + 1};`;
    params.push(limit);

    const res = await db.query(query, params);
    return res.rows.map((row) => ({
      id: String(row.id),
      userId: Number(row.user_id),
      courseId: Number(row.course_id),
      eventType: row.event_type as LearningEventType,
      contentType: row.content_type ? (row.content_type as LearningContentType) : null,
      contentIdentifier: row.content_identifier,
      subjectId: row.subject_id ? Number(row.subject_id) : null,
      chapterId: row.chapter_id ? Number(row.chapter_id) : null,
      topicId: row.topic_id ? Number(row.topic_id) : null,
      eventAt: new Date(row.event_at).toISOString(),
      idempotencyKey: row.idempotency_key,
      metadata: row.metadata,
    }));
  }

  /**
   * Retrieves the authoritative classroom curriculum for an eligible enrolled student.
   * Builds the complete academic hierarchy (Course -> Subjects -> Chapters -> Topics)
   * with attached video and document metadata, and student completion progress.
   * Sanitizes all payloads to strictly omit server file paths and private credentials.
   */
  static async getClassroomCurriculum(
    userId: number,
    courseId: number
  ): Promise<ClassroomCurriculumData> {
    const numericUserId = Number(userId);
    const numericCourseId = Number(courseId);

    const allCourses = AcademicHierarchyValidator.getCourses();
    const course = allCourses.find((c) => Number(c.id) === numericCourseId);
    const courseTitle = course ? course.title : `Course #${numericCourseId}`;
    const courseSlug = course ? course.slug : String(numericCourseId);
    const examTag = (course as any)?.examTag || (course as any)?.targetExam || 'General';
    const description = (course as any)?.description || '';

    const allSubjects = AcademicHierarchyValidator.getSubjects();
    const allChapters = AcademicHierarchyValidator.getChapters();
    const courseChapters = allChapters.filter((ch) => Number(ch.courseId) === numericCourseId);
    const courseTopics = AcademicHierarchyValidator.getEligibleTopicsForCourse(numericCourseId);

    const allVideos = readVideosFromDb();
    const allDocs = readDocumentsFromDb();

    const db = await getCommerceDb();

    // Query topic progress for this student & course
    const topicProgressRes = await db.query(
      `SELECT topic_id, status, started_at, completed_at, last_activity_at
       FROM learning.student_topic_progress
       WHERE user_id = $1 AND course_id = $2;`,
      [numericUserId, numericCourseId]
    );

    const topicProgressMap = new Map<number, any>();
    const completedTopicIds = new Set<number>();
    for (const r of topicProgressRes.rows) {
      const tId = Number(r.topic_id);
      topicProgressMap.set(tId, r);
      if (r.status === 'COMPLETED') {
        completedTopicIds.add(tId);
      }
    }

    // Query content progress for this student & course
    const contentProgressRes = await db.query(
      `SELECT content_type, content_identifier, status, completed_at, last_activity_at
       FROM learning.student_content_progress
       WHERE user_id = $1 AND course_id = $2;`,
      [numericUserId, numericCourseId]
    );

    const contentProgressMap = new Map<string, any>();
    for (const r of contentProgressRes.rows) {
      contentProgressMap.set(`${r.content_type}:${r.content_identifier}`, r);
    }

    // Query last activity
    const activityRes = await db.query(
      `SELECT last_accessed_subject_id, last_accessed_chapter_id,
              last_accessed_topic_id, last_activity_at
       FROM learning.student_course_activity
       WHERE user_id = $1 AND course_id = $2;`,
      [numericUserId, numericCourseId]
    );

    const actRow = activityRes.rows[0];
    const lastActivity = actRow
      ? {
          subjectId: actRow.last_accessed_subject_id ? Number(actRow.last_accessed_subject_id) : null,
          chapterId: actRow.last_accessed_chapter_id ? Number(actRow.last_accessed_chapter_id) : null,
          topicId: actRow.last_accessed_topic_id ? Number(actRow.last_accessed_topic_id) : null,
          lastActivityAt: actRow.last_activity_at ? new Date(actRow.last_activity_at).toISOString() : null,
        }
      : null;

    const courseSubjectIds = Array.from(new Set(courseChapters.map((ch) => Number(ch.subjectId))));
    const subjects: ClassroomSubject[] = [];

    let totalCourseTopics = 0;
    let completedCourseTopics = 0;
    let totalCourseVideos = 0;
    let completedCourseVideos = 0;
    let totalCourseDocs = 0;
    let completedCourseDocs = 0;

    for (const subId of courseSubjectIds) {
      const subject = allSubjects.find((s) => Number(s.id) === subId);
      const subjectName = subject ? subject.subjectName : `Subject #${subId}`;
      const subjectChapters = courseChapters.filter((ch) => Number(ch.subjectId) === subId);

      const chapters: ClassroomChapter[] = [];
      let totalSubjectTopics = 0;
      let completedSubjectTopics = 0;
      let completedSubjectChapters = 0;

      for (const chapter of subjectChapters) {
        const chapterTopics = courseTopics.filter((t) => Number(t.chapterId) === Number(chapter.id));
        const totalTopicsInChapter = chapterTopics.length;
        const completedTopicsInChapter = chapterTopics.filter((t) => completedTopicIds.has(Number(t.id))).length;

        totalSubjectTopics += totalTopicsInChapter;
        completedSubjectTopics += completedTopicsInChapter;

        const isChapterCompleted = totalTopicsInChapter > 0 && completedTopicsInChapter === totalTopicsInChapter;
        const chapterPercentage =
          totalTopicsInChapter > 0
            ? Math.round((completedTopicsInChapter / totalTopicsInChapter) * 10000) / 100
            : 0.0;

        if (isChapterCompleted) {
          completedSubjectChapters++;
        }

        const topics: TopicProgressItem[] = chapterTopics.map((topic) => {
          const prog = topicProgressMap.get(Number(topic.id));
          const topicStatus: TopicProgressStatus = prog ? (prog.status as TopicProgressStatus) : 'NOT_STARTED';

          return {
            topicId: Number(topic.id),
            topicName: topic.topicName,
            topicCode: (topic as any).topicCode,
            slug: topic.slug,
            displayOrder: Number((topic as any).displayOrder || 1),
            status: topicStatus,
            startedAt: prog?.started_at ? new Date(prog.started_at).toISOString() : null,
            completedAt: prog?.completed_at ? new Date(prog.completed_at).toISOString() : null,
            lastActivityAt: prog?.last_activity_at ? new Date(prog.last_activity_at).toISOString() : null,
          };
        });

        // Filter and sanitize published videos matching this chapter
        const chapterVideos = allVideos.filter(
          (v) =>
            (v.status === 'Published' || !v.status) &&
            (v.chapter.trim().toLowerCase() === chapter.chapterName.trim().toLowerCase() ||
              (v as any).chapterId === chapter.id)
        );

        const videos: SanitizedClassroomVideo[] = chapterVideos.map((v) => {
          const prog =
            contentProgressMap.get(`VIDEO:${v.vimeoVideoId}`) ||
            contentProgressMap.get(`VIDEO:${v.id}`);
          const vStatus: TopicProgressStatus = prog ? (prog.status as TopicProgressStatus) : 'NOT_STARTED';

          totalCourseVideos++;
          if (vStatus === 'COMPLETED') {
            completedCourseVideos++;
          }

          return {
            id: Number(v.id),
            title: v.title,
            vimeoVideoId: v.vimeoVideoId,
            durationMinutes: Number(v.durationMinutes || 0),
            isFreePreview: Boolean(v.isFreePreview),
            displayOrder: Number(v.displayOrder || 1),
            status: vStatus,
            completedAt: prog?.completed_at ? new Date(prog.completed_at).toISOString() : null,
            lastActivityAt: prog?.last_activity_at ? new Date(prog.last_activity_at).toISOString() : null,
          };
        });

        // Filter and sanitize published documents matching this chapter
        const chapterDocs = allDocs.filter(
          (d) =>
            (d.status === 'Published' || !d.status) &&
            (d.chapter.trim().toLowerCase() === chapter.chapterName.trim().toLowerCase() ||
              (d as any).chapterId === chapter.id)
        );

        const documents: SanitizedClassroomDocument[] = chapterDocs.map((d) => {
          const prog =
            contentProgressMap.get(`PDF:${d.id}`) ||
            (d.fileUrl ? contentProgressMap.get(`PDF:${d.fileUrl}`) : null);
          const dStatus: TopicProgressStatus = prog ? (prog.status as TopicProgressStatus) : 'NOT_STARTED';

          totalCourseDocs++;
          if (dStatus === 'COMPLETED') {
            completedCourseDocs++;
          }

          return {
            id: Number(d.id),
            title: d.title,
            fileType: d.fileType || 'PDF',
            fileSizeBytes: d.fileSizeBytes,
            pageCount: d.pageCount,
            description: d.description,
            displayOrder: Number(d.displayOrder || 1),
            status: dStatus,
            completedAt: prog?.completed_at ? new Date(prog.completed_at).toISOString() : null,
            lastActivityAt: prog?.last_activity_at ? new Date(prog.last_activity_at).toISOString() : null,
          };
        });

        chapters.push({
          chapterId: Number(chapter.id),
          chapterName: chapter.chapterName,
          chapterCode: (chapter as any).chapterCode,
          slug: chapter.slug,
          description: (chapter as any).description,
          displayOrder: Number(chapter.displayOrder || 1),
          topics,
          videos,
          documents,
          totalTopics: totalTopicsInChapter,
          completedTopics: completedTopicsInChapter,
          remainingTopics: Math.max(0, totalTopicsInChapter - completedTopicsInChapter),
          completionPercentage: chapterPercentage,
          isCompleted: isChapterCompleted,
        });
      }

      totalCourseTopics += totalSubjectTopics;
      completedCourseTopics += completedSubjectTopics;

      const isSubjectCompleted =
        subjectChapters.length > 0 &&
        completedSubjectChapters ===
          subjectChapters.filter((ch) => {
            const chTopics = courseTopics.filter((t) => Number(t.chapterId) === Number(ch.id));
            return chTopics.length > 0;
          }).length &&
        totalSubjectTopics > 0 &&
        completedSubjectTopics === totalSubjectTopics;

      const subjectPercentage =
        totalSubjectTopics > 0
          ? Math.round((completedSubjectTopics / totalSubjectTopics) * 10000) / 100
          : 0.0;

      subjects.push({
        subjectId: subId,
        subjectName,
        subjectCode: (subject as any)?.subjectCode,
        slug: subject?.slug,
        description: (subject as any)?.description,
        displayOrder: (subject as any)?.displayIndex || 1,
        totalChapters: subjectChapters.length,
        completedChapters: completedSubjectChapters,
        totalTopics: totalSubjectTopics,
        completedTopics: completedSubjectTopics,
        completionPercentage: subjectPercentage,
        isCompleted: isSubjectCompleted,
        chapters,
      });
    }

    const coursePercentage =
      totalCourseTopics > 0
        ? Math.round((completedCourseTopics / totalCourseTopics) * 10000) / 100
        : 0.0;

    return {
      courseId: numericCourseId,
      courseTitle,
      courseSlug,
      examTag,
      description,
      lastActivity,
      progress: {
        totalTopics: totalCourseTopics,
        completedTopics: completedCourseTopics,
        remainingTopics: Math.max(0, totalCourseTopics - completedCourseTopics),
        completionPercentage: coursePercentage,
        totalVideos: totalCourseVideos,
        completedVideos: completedCourseVideos,
        totalDocuments: totalCourseDocs,
        completedDocuments: completedCourseDocs,
      },
      subjects,
    };
  }
}
