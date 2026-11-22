export interface StudentNoteRecord {
  id: number;
  studentId: number;
  courseId?: number | null;
  courseTitle?: string | null;
  subjectId?: number | null;
  subjectName?: string | null;
  chapterId?: number | null;
  chapterName?: string | null;
  topicId?: number | null;
  topicName?: string | null;
  videoId?: number | null;
  videoTitle?: string | null;
  documentId?: number | null;
  documentTitle?: string | null;
  title: string;
  content: string;
  plainTextPreview: string;
  tags: string[];
  isPinned: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface NotesSummaryMetrics {
  total: number;
  pinned: number;
  courseCount: number;
  recentNotes: StudentNoteRecord[];
}
