import fs from 'fs';
import path from 'path';
import { getCourseBySlugOrId, readCoursesFromDb, CourseRecord } from './courses';
import { readSubjectsFromDb, readCourseSubjectsFromDb, SubjectRecord } from './subjects';
import { readChaptersFromDb, ChapterRecord } from './chapters';
import { readTopicsFromDb, TopicRecord } from './topics';

export interface CurriculumTopic {
  id: number;
  topicName: string;
  topicCode?: string;
  slug?: string;
  displayOrder?: number;
}

export interface CurriculumChapter {
  id: number;
  chapterName: string;
  chapterCode?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  topicsCount: number;
  topics: CurriculumTopic[];
}

export interface CurriculumSubject {
  id: number;
  subjectName: string;
  subjectCode: string;
  slug?: string;
  description?: string;
  displayIndex?: number;
  chaptersCount: number;
  topicsCount: number;
  chapters: CurriculumChapter[];
}

export interface CourseCurriculumStructure {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  subjectsCount: number;
  chaptersCount: number;
  topicsCount: number;
  subjects: CurriculumSubject[];
}

export interface SyllabusModule {
  title: string;
  duration?: string;
  lessonsCount?: number;
  topics: string[];
  subjectId?: number;
  chapters?: Array<{
    id: number;
    title: string;
    topics: string[];
  }>;
}

/**
 * Build a structured academic curriculum hierarchy for a given course:
 * Course -> Subjects (assigned via course-subjects.json) -> Chapters -> Topics
 */
export function getCourseCurriculum(courseId: number): CourseCurriculumStructure | null {
  const numId = Number(courseId);
  if (!numId || isNaN(numId)) return null;

  const courses = readCoursesFromDb();
  const course = courses.find((c) => Number(c.id) === numId);
  if (!course) return null;

  const allSubjects = readSubjectsFromDb();
  const subjectMap = new Map<number, SubjectRecord>();
  allSubjects.forEach((s) => subjectMap.set(Number(s.id), s));

  // 1. Get assigned subject IDs for this course
  const joins = readCourseSubjectsFromDb();
  const assignedJoins = joins
    .filter((j) => Number(j.courseId) === numId)
    .sort((a, b) => (Number(a.displayOrder) || a.id) - (Number(b.displayOrder) || b.id));

  let assignedSubjectIds: number[] = assignedJoins.map((j) => Number(j.subjectId));

  // Fallback to course.subjectIds if joins empty
  if (assignedSubjectIds.length === 0 && Array.isArray(course.subjectIds)) {
    assignedSubjectIds = course.subjectIds.map(Number).filter(Boolean);
  }

  // 2. Read chapters and topics
  const allChapters = readChaptersFromDb();
  const allTopics = readTopicsFromDb();

  const chaptersBySubjectMap = new Map<number, ChapterRecord[]>();
  for (const ch of allChapters) {
    if (Number(ch.courseId) === numId && ch.isActive !== false) {
      const sId = Number(ch.subjectId);
      const list = chaptersBySubjectMap.get(sId) || [];
      list.push(ch);
      chaptersBySubjectMap.set(sId, list);
    }
  }

  // If no subject joins exist, also check if chapters exist for this course and deduce subjects
  if (assignedSubjectIds.length === 0) {
    assignedSubjectIds = Array.from(chaptersBySubjectMap.keys());
  }

  const topicsByChapterMap = new Map<number, TopicRecord[]>();
  for (const top of allTopics) {
    if (Number(top.courseId) === numId && top.isActive !== false) {
      const chId = Number(top.chapterId);
      const list = topicsByChapterMap.get(chId) || [];
      list.push(top);
      topicsByChapterMap.set(chId, list);
    }
  }

  let totalChapters = 0;
  let totalTopics = 0;

  const structuredSubjects: CurriculumSubject[] = [];

  for (const sId of assignedSubjectIds) {
    const subject = subjectMap.get(sId);
    if (!subject || subject.isActive === false) continue;

    const chapters = (chaptersBySubjectMap.get(sId) || []).sort(
      (a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999)
    );

    const chapterList: CurriculumChapter[] = [];
    let subjectTopicCount = 0;

    for (const ch of chapters) {
      const topics = (topicsByChapterMap.get(Number(ch.id)) || []).sort(
        (a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999)
      );

      subjectTopicCount += topics.length;

      chapterList.push({
        id: ch.id,
        chapterName: ch.chapterName,
        chapterCode: ch.chapterCode,
        slug: ch.slug,
        description: ch.description,
        displayOrder: ch.displayOrder,
        topicsCount: topics.length,
        topics: topics.map((t) => ({
          id: t.id,
          topicName: t.topicName,
          topicCode: t.topicCode,
          slug: t.slug,
          displayOrder: t.displayOrder,
        })),
      });
    }

    totalChapters += chapterList.length;
    totalTopics += subjectTopicCount;

    structuredSubjects.push({
      id: subject.id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      slug: subject.slug,
      description: subject.description,
      displayIndex: subject.displayIndex,
      chaptersCount: chapterList.length,
      topicsCount: subjectTopicCount,
      chapters: chapterList,
    });
  }

  return {
    courseId: numId,
    courseTitle: course.title,
    courseSlug: course.slug,
    subjectsCount: structuredSubjects.length,
    chaptersCount: totalChapters,
    topicsCount: totalTopics,
    subjects: structuredSubjects,
  };
}

/**
 * Generate syllabus modules compatible with CourseDetail.jsx accordion
 */
export function getCourseSyllabusModules(courseId: number): SyllabusModule[] {
  const structure = getCourseCurriculum(courseId);
  if (!structure || structure.subjects.length === 0) {
    return [];
  }

  return structure.subjects.map((sub, idx) => {
    const topicsList: string[] = [];
    const chapterDetails: Array<{ id: number; title: string; topics: string[] }> = [];

    for (const ch of sub.chapters) {
      const chTopics = ch.topics.map((t) => t.topicName);
      chapterDetails.push({
        id: ch.id,
        title: ch.chapterName,
        topics: chTopics,
      });

      if (chTopics.length > 0) {
        for (const t of chTopics) {
          topicsList.push(`${ch.chapterName} - ${t}`);
        }
      } else {
        topicsList.push(ch.chapterName);
      }
    }

    const estimatedHours = Math.max(15, sub.chapters.length * 8 + sub.topicsCount * 2);
    const lessonsCount = Math.max(sub.chaptersCount, sub.chaptersCount + sub.topicsCount);

    return {
      title: `Module ${idx + 1}: ${sub.subjectName} (${sub.chaptersCount} Chapters${sub.topicsCount > 0 ? `, ${sub.topicsCount} Topics` : ''})`,
      duration: `${estimatedHours} Hours`,
      lessonsCount: lessonsCount,
      topics: topicsList.length > 0 ? topicsList : [`Comprehensive ${sub.subjectName} curriculum, problem sets and shortcuts`],
      subjectId: sub.id,
      chapters: chapterDetails,
    };
  });
}

/**
 * Fetch course with dynamically hydrated curriculum and syllabus modules
 */
export function getCourseWithDynamicCurriculum(
  slugOrId: string | number,
  options?: boolean | { includeInactive?: boolean; allowArchived?: boolean }
): (CourseRecord & { curriculum?: CourseCurriculumStructure; dynamicSyllabusModules?: SyllabusModule[] }) | null {
  const course = getCourseBySlugOrId(slugOrId, options);
  if (!course) return null;

  const curriculum = getCourseCurriculum(course.id);
  const dynamicModules = getCourseSyllabusModules(course.id);

  // If course has no explicit syllabusModules or dynamic modules were generated from assigned subjects,
  // enrich the response so public UI reflects real-time academic hierarchy
  const enriched: CourseRecord & {
    curriculum?: CourseCurriculumStructure;
    dynamicSyllabusModules?: SyllabusModule[];
  } = {
    ...course,
    curriculum: curriculum || undefined,
  };

  if (dynamicModules.length > 0) {
    enriched.syllabusModules = dynamicModules;
    enriched.dynamicSyllabusModules = dynamicModules;
  }

  return enriched;
}
