export type DoubtStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ANSWERED'
  | 'RESOLVED'
  | 'REOPENED';

export type DoubtPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export type ReplyVisibility = 'STUDENT_VISIBLE' | 'INTERNAL_NOTE';

export interface DoubtAttachmentItem {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface DoubtReply {
  id: number;
  doubtId: number;
  authorId: number;
  authorName: string;
  authorRole: 'STUDENT' | 'FACULTY' | 'ADMIN';
  message: string;
  visibility: ReplyVisibility;
  attachments: DoubtAttachmentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DoubtAssignmentHistory {
  id: number;
  doubtId: number;
  previousFacultyId?: number | null;
  newFacultyId: number;
  newFacultyName: string;
  assignedBy: number;
  notes?: string | null;
  createdAt: string;
}

export interface DoubtRecord {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail?: string;
  courseId: number;
  courseTitle: string;
  subjectId?: number | null;
  subjectName?: string | null;
  chapterId?: number | null;
  chapterName?: string | null;
  topicId?: number | null;
  topicName?: string | null;
  lessonId?: number | null;
  lessonTitle?: string | null;
  videoTimestampMinutes?: string | null;
  documentId?: number | null;
  title: string;
  description: string;
  status: DoubtStatus;
  priority: DoubtPriority;
  assignedFacultyId?: number | null;
  assignedFacultyName?: string | null;
  assignedAt?: string | null;
  assignedBy?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
  lastReplyAt?: string | null;
  replies?: DoubtReply[];
}

export interface DoubtSummaryMetrics {
  total: number;
  open: number;
  inProgress: number;
  answered: number;
  resolved: number;
  reopened: number;
  unassigned?: number;
}
