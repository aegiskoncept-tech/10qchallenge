// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 ACADEMIC HIERARCHY VALIDATION LAYER
// Validates complete relational hierarchy against authoritative canonical data.
// Prevents cross-course topic spoofing, ensures zero-topic safety.
// ==============================================================================

import fs from 'fs';
import path from 'path';

interface CanonicalCourse {
  id: number;
  title: string;
  slug: string;
  isActive?: boolean;
}

interface CanonicalSubject {
  id: number;
  subjectName: string;
  slug: string;
  isActive?: boolean;
}

interface CanonicalChapter {
  id: number;
  courseId: number;
  subjectId: number;
  chapterName: string;
  slug: string;
  chapterCode?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

interface CanonicalTopic {
  id: number;
  courseId: number;
  subjectId: number;
  chapterId: number;
  topicName: string;
  slug: string;
  isActive?: boolean;
}

function loadJson<T>(filename: string): T[] {
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, filename), path.join(persistentDir, 'data', filename)] : []),
    path.join(process.cwd(), 'data', filename),
    path.join(process.cwd(), 'frontend', 'data', filename),
  ];

  for (const targetPath of candidates) {
    if (fs.existsSync(targetPath)) {
      try {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (err) {
        console.error(`[loadJson Error: ${filename}]`, err);
      }
    }
  }
  return [];
}

export class AcademicHierarchyValidator {
  /**
   * Retrieves all canonical courses from Course Master
   */
  static getCourses(): CanonicalCourse[] {
    return loadJson<CanonicalCourse>('courses.json');
  }

  /**
   * Retrieves all canonical subjects from Subject Master
   */
  static getSubjects(): CanonicalSubject[] {
    return loadJson<CanonicalSubject>('subjects.json');
  }

  /**
   * Retrieves all canonical chapters from Chapter Master
   */
  static getChapters(): CanonicalChapter[] {
    return loadJson<CanonicalChapter>('chapters.json');
  }

  /**
   * Retrieves all canonical topics from Topic Master
   */
  static getTopics(): CanonicalTopic[] {
    return loadJson<CanonicalTopic>('topics.json');
  }

  /**
   * Validates that a topic exists and strictly belongs to the supplied course.
   * Derives verified subjectId and chapterId directly from canonical hierarchy.
   * Throws an error if any level of the hierarchy is invalid or mismatched.
   */
  static validateTopicHierarchy(
    courseId: number,
    topicId: number
  ): {
    courseId: number;
    subjectId: number;
    chapterId: number;
    topicId: number;
    topicName: string;
  } {
    const numericCourseId = Number(courseId);
    const numericTopicId = Number(topicId);

    if (isNaN(numericCourseId) || numericCourseId <= 0) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }
    if (isNaN(numericTopicId) || numericTopicId <= 0) {
      throw new Error(`Invalid topic ID: ${topicId}`);
    }

    const topics = this.getTopics();
    const topic = topics.find((t) => Number(t.id) === numericTopicId);
    if (!topic) {
      throw new Error(`Topic #${numericTopicId} does not exist in canonical Topic Master.`);
    }

    // Strict cross-course topic spoofing guard
    if (Number(topic.courseId) !== numericCourseId) {
      throw new Error(
        `Hierarchy mismatch: Topic #${numericTopicId} belongs to Course #${topic.courseId}, not Course #${numericCourseId}.`
      );
    }

    const chapters = this.getChapters();
    const chapter = chapters.find((c) => Number(c.id) === Number(topic.chapterId));
    if (!chapter) {
      throw new Error(`Integrity error: Chapter #${topic.chapterId} referenced by Topic #${topic.id} not found.`);
    }

    if (Number(chapter.courseId) !== numericCourseId) {
      throw new Error(
        `Hierarchy mismatch: Chapter #${chapter.id} belongs to Course #${chapter.courseId}, not Course #${numericCourseId}.`
      );
    }

    const subjects = this.getSubjects();
    const subject = subjects.find((s) => Number(s.id) === Number(topic.subjectId));
    if (!subject) {
      throw new Error(`Integrity error: Subject #${topic.subjectId} referenced by Topic #${topic.id} not found.`);
    }

    return {
      courseId: numericCourseId,
      subjectId: Number(topic.subjectId),
      chapterId: Number(topic.chapterId),
      topicId: Number(topic.id),
      topicName: topic.topicName,
    };
  }

  /**
   * Validates that content exists in Video Master or Document Master
   */
  static validateContentIdentifier(
    contentType: 'VIDEO' | 'PDF',
    contentIdentifier: string
  ): boolean {
    if (!contentIdentifier || typeof contentIdentifier !== 'string') {
      throw new Error('Content identifier must be a non-empty string.');
    }

    const trimmedId = contentIdentifier.trim();
    if (contentType === 'VIDEO') {
      const allVideos = loadJson<any>('videos.json');
      const exists =
        allVideos.some(
          (v) => String(v.id) === trimmedId || v.vimeoVideoId === trimmedId || (v as any).providerVideoId === trimmedId
        );
      if (!exists) {
        throw new Error(`Video identifier "${trimmedId}" does not exist in Video Master.`);
      }
      return true;
    }

    if (contentType === 'PDF') {
      const allDocs = loadJson<any>('documents.json');
      const exists =
        allDocs.some((d) => String(d.id) === trimmedId || d.fileUrl === trimmedId);
      if (!exists) {
        throw new Error(`Document identifier "${trimmedId}" does not exist in Document Master.`);
      }
      return true;
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  }

  /**
   * Validates content existence and strict course/chapter hierarchy association.
   * Prevents cross-course content spoofing without inventing topic associations.
   */
  static validateContentHierarchy(
    courseId: number,
    contentType: 'VIDEO' | 'PDF',
    contentIdentifier: string
  ): {
    courseId: number;
    subjectId: number | null;
    chapterId: number | null;
    contentIdentifier: string;
    title: string;
  } {
    const numericCourseId = Number(courseId);
    if (isNaN(numericCourseId) || numericCourseId <= 0) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }
    if (!contentIdentifier || typeof contentIdentifier !== 'string') {
      throw new Error('Content identifier must be a non-empty string.');
    }

    const trimmedId = contentIdentifier.trim();
    const chapters = this.getChapters();

    if (contentType === 'VIDEO') {
      const allVideos = loadJson<any>('videos.json');
      const video =
        allVideos.find(
          (v) => String(v.id) === trimmedId || v.vimeoVideoId === trimmedId || (v as any).providerVideoId === trimmedId
        );
      if (!video) {
        throw new Error(`Video identifier "${trimmedId}" does not exist in Video Master.`);
      }

      // Check chapter linkage
      const matchingChapter = chapters.find(
        (ch) =>
          ch.chapterName.trim().toLowerCase() === video.chapter.trim().toLowerCase() ||
          (video as any).chapterId === ch.id
      );

      if (matchingChapter && Number(matchingChapter.courseId) !== numericCourseId) {
        throw new Error(
          `Hierarchy mismatch: Video "${video.title}" belongs to Course #${matchingChapter.courseId}, not Course #${numericCourseId}.`
        );
      }

      return {
        courseId: numericCourseId,
        subjectId: matchingChapter ? Number(matchingChapter.subjectId) : null,
        chapterId: matchingChapter ? Number(matchingChapter.id) : null,
        contentIdentifier: video.vimeoVideoId || (video as any).providerVideoId || String(video.id),
        title: video.title,
      };
    }

    if (contentType === 'PDF') {
      const allDocs = loadJson<any>('documents.json');
      const doc =
        allDocs.find((d) => String(d.id) === trimmedId || d.fileUrl === trimmedId);
      if (!doc) {
        throw new Error(`Document identifier "${trimmedId}" does not exist in Document Master.`);
      }

      // Check chapter linkage
      const matchingChapter = chapters.find(
        (ch) => ch.chapterName.trim().toLowerCase() === doc.chapter.trim().toLowerCase()
      );

      if (matchingChapter && Number(matchingChapter.courseId) !== numericCourseId) {
        throw new Error(
          `Hierarchy mismatch: Document "${doc.title}" belongs to Course #${matchingChapter.courseId}, not Course #${numericCourseId}.`
        );
      }

      return {
        courseId: numericCourseId,
        subjectId: matchingChapter ? Number(matchingChapter.subjectId) : null,
        chapterId: matchingChapter ? Number(matchingChapter.id) : null,
        contentIdentifier: String(doc.id),
        title: doc.title,
      };
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  }

  /**
   * Retrieves all active/eligible topics for a course
   */
  static getEligibleTopicsForCourse(courseId: number): CanonicalTopic[] {
    const topics = this.getTopics();
    return topics.filter(
      (t) => Number(t.courseId) === Number(courseId) && (t.isActive === undefined || t.isActive === true)
    );
  }

  /**
   * Retrieves all active/eligible topics for a specific chapter
   */
  static getEligibleTopicsForChapter(chapterId: number): CanonicalTopic[] {
    const topics = this.getTopics();
    return topics.filter(
      (t) => Number(t.chapterId) === Number(chapterId) && (t.isActive === undefined || t.isActive === true)
    );
  }
}
