// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 LEARNING PROGRESS TYPE DEFINITIONS
// Canonical Data Types for Academic Hierarchy Validation & Progress Storage
// ==============================================================================

export type TopicProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ProgressMutationStatus = 'IN_PROGRESS' | 'COMPLETED';

export type LearningContentType = 'VIDEO' | 'PDF';
export type ContentProgressStatus = 'IN_PROGRESS' | 'COMPLETED';

export type LearningEventType =
  | 'TOPIC_STARTED'
  | 'TOPIC_COMPLETED'
  | 'VIDEO_STARTED'
  | 'VIDEO_COMPLETED'
  | 'DOCUMENT_OPENED'
  | 'DOCUMENT_COMPLETED';

export interface StudentTopicProgressRecord {
  id: string;
  userId: number;
  courseId: number;
  subjectId: number;
  chapterId: number;
  topicId: number;
  status: ProgressMutationStatus;
  startedAt: string;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentContentProgressRecord {
  id: string;
  userId: number;
  courseId: number;
  contentType: LearningContentType;
  contentIdentifier: string;
  status: ContentProgressStatus;
  lastActivityAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentLearningEventRecord {
  id: string;
  userId: number;
  courseId: number;
  eventType: LearningEventType;
  contentType: LearningContentType | null;
  contentIdentifier: string | null;
  subjectId: number | null;
  chapterId: number | null;
  topicId: number | null;
  eventAt: string;
  idempotencyKey: string | null;
  metadata?: Record<string, any> | null;
}

export interface StudentCourseActivityRecord {
  userId: number;
  courseId: number;
  lastAccessedSubjectId: number | null;
  lastAccessedChapterId: number | null;
  lastAccessedTopicId: number | null;
  lastActivityAt: string;
}

export interface TopicProgressItem {
  topicId: number;
  topicName: string;
  topicCode?: string;
  slug?: string;
  displayOrder?: number;
  status: TopicProgressStatus;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
}

export interface ChapterProgressSummary {
  chapterId: number;
  chapterName: string;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  completionPercentage: number;
  isCompleted: boolean;
  topics?: TopicProgressItem[];
}

export interface SubjectProgressSummary {
  subjectId: number;
  subjectName: string;
  totalChapters: number;
  completedChapters: number;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  completionPercentage: number;
  isCompleted: boolean;
  chapters: ChapterProgressSummary[];
}

export interface CourseProgressSummary {
  courseId: number;
  courseTitle: string;
  slug?: string;
  examTag?: string;
  totalSubjects: number;
  completedSubjects: number;
  totalChapters: number;
  completedChapters: number;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  courseCompletionPercentage: number;
  lastActivityAt: string | null;
  lastAccessedLocation?: {
    subjectId: number | null;
    chapterId: number | null;
    topicId: number | null;
    lastActivityAt: string | null;
  } | null;
  subjects: SubjectProgressSummary[];
}

export interface CourseSummaryItem {
  courseId: number;
  courseTitle: string;
  slug: string;
  examTag: string;
  totalSubjects: number;
  completedSubjects: number;
  totalChapters: number;
  completedChapters: number;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  completionPercentage: number;
  lastActivityAt: string | null;
}

export interface StudentOverallSummary {
  totalCourses: number;
  overall: {
    totalEligibleTopics: number;
    completedTopics: number;
    remainingTopics: number;
    totalChapters: number;
    completedChapters: number;
    totalSubjects: number;
    completedSubjects: number;
    averageCompletionPercentage: number;
    lastActivityAt: string | null;
  };
  courses: CourseSummaryItem[];
  recentActivity: StudentLearningEventRecord[];
}

export interface SanitizedClassroomVideo {
  id: number;
  title: string;
  vimeoVideoId: string;
  durationMinutes: number;
  isFreePreview: boolean;
  displayOrder: number;
  status: TopicProgressStatus;
  completedAt: string | null;
  lastActivityAt: string | null;
}

export interface SanitizedClassroomDocument {
  id: number;
  title: string;
  category?: string;
  allowDownload?: boolean;
  isFreePreview?: boolean;
  fileType: string;
  fileSizeBytes?: string;
  pageCount?: number;
  description?: string;
  displayOrder: number;
  status: TopicProgressStatus;
  completedAt: string | null;
  lastActivityAt: string | null;
}

export interface ClassroomChapter {
  chapterId: number;
  chapterName: string;
  chapterCode?: string;
  slug?: string;
  description?: string;
  displayOrder: number;
  topics: TopicProgressItem[];
  videos: SanitizedClassroomVideo[];
  documents: SanitizedClassroomDocument[];
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  completionPercentage: number;
  isCompleted: boolean;
}

export interface ClassroomSubject {
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  totalChapters: number;
  completedChapters: number;
  totalTopics: number;
  completedTopics: number;
  completionPercentage: number;
  isCompleted: boolean;
  chapters: ClassroomChapter[];
}

export interface ClassroomCurriculumData {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  examTag?: string;
  description?: string;
  lastActivity: {
    subjectId: number | null;
    chapterId: number | null;
    topicId: number | null;
    lastActivityAt: string | null;
  } | null;
  progress: {
    totalTopics: number;
    completedTopics: number;
    remainingTopics: number;
    completionPercentage: number;
    totalVideos: number;
    completedVideos: number;
    totalDocuments: number;
    completedDocuments: number;
  };
  subjects: ClassroomSubject[];
}

