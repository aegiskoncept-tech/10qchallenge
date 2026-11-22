// ==============================================================================
// 10Q CHALLENGE LMS — STUDENT DASHBOARD DATA ACCESS LAYER
// Authoritative aggregation of student profile, course progress, video & document
// delivery, CBT test performance, learning streaks, and explainable recommendations.
// ==============================================================================

import { AuthDb } from '@/lib/auth/database';
import { readTestAttemptsFromDb, TestAttemptRecord } from './test-attempts';
import { getStudentDoubts, DoubtRecord } from './doubts';
import { readTestSeriesFromDb } from './test-series';
import { getCourseBySlugOrId } from './courses';
import { getCommerceDb } from '@/lib/commerce/db';
import { getStudentCoursesData } from './student-courses';
import { LearningProgressService } from '@/lib/learning/progress-service';
import { readVideosFromDb } from './videos';
import { readDocumentsFromDb } from './documents';
import { readQuestionsFromDb } from './questions';
import { readSubjectsFromDb } from './subjects';
import { readChaptersFromDb } from './chapters';

export interface DashboardStudentProfile {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string | null;
  targetExam: string | null;
  role: string;
  createdAt: string;
}

export interface DashboardOverviewMetrics {
  enrolledCoursesCount: number;
  completedCoursesCount: number;
  overallProgressPercentage: number;
  lessonsCompletedCount: number;
  completedTestsCount: number;
  attemptedTestsCount: number;
  availableTestsCount: number;
  averageScorePercentage: number | null;
  averageAccuracy: number | null;
  studyTimeMinutes: number;
  currentStreakDays: number;
  totalDoubtsCount: number;
  pendingDoubtsCount: number;
  resolvedDoubtsCount: number;
}

export interface DashboardLatestScore {
  attemptId: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  submittedAt: string;
  finalScore: number;
  maximumMarks: number;
  percentageScore: number;
  accuracy: number;
  submissionReason: 'MANUAL' | 'TIMEOUT';
}

export interface DashboardRecentTestItem {
  attemptId: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'ABANDONED';
  startedAt: string;
  submittedAt: string | null;
  finalScore: number | null;
  maximumMarks: number | null;
  percentageScore: number | null;
  accuracy: number | null;
}

export interface DashboardCourseProgressItem {
  enrollmentId: string;
  courseId: number;
  title: string;
  slug: string;
  examTag: string;
  image: string | null;
  enrolledAt: string;
  accessState: string;
  progressPercentage: number;
  totalChapters: number;
  completedChapters: number;
  totalTopics: number;
  completedTopics: number;
  totalVideos: number;
  completedVideos: number;
  totalDocuments: number;
  completedDocuments: number;
  lastActivityAt: string | null;
  continueUrl: string;
}

export interface DashboardContinueLearning {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  courseImage: string | null;
  examTag: string;
  subjectName?: string | null;
  chapterName?: string | null;
  lessonTitle?: string | null;
  lessonType?: 'TOPIC' | 'VIDEO' | 'DOCUMENT' | null;
  progressPercentage: number;
  lastActivityAt: string;
  resumeUrl: string;
}

export interface DashboardContentProgressMetrics {
  totalVideos: number;
  completedVideos: number;
  remainingVideos: number;
  videoCompletionPercentage: number;
  totalDocuments: number;
  completedDocuments: number;
  remainingDocuments: number;
  documentCompletionPercentage: number;
  recentVideos: Array<{
    id: number;
    title: string;
    courseTitle: string;
    durationMinutes: number;
    status: 'IN_PROGRESS' | 'COMPLETED';
    lastActivityAt: string;
  }>;
  recentDocuments: Array<{
    id: number;
    title: string;
    courseTitle: string;
    fileType: string;
    status: 'OPENED' | 'COMPLETED';
    lastActivityAt: string;
  }>;
}

export interface DashboardSubjectPerformanceItem {
  subjectId: number;
  subjectName: string;
  questionsAttempted: number;
  correctQuestions: number;
  incorrectQuestions: number;
  marksObtained: number;
  maximumMarks: number;
  accuracy: number;
}

export interface DashboardScoreTrendItem {
  attemptId: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  submittedAt: string;
  finalScore: number;
  maximumMarks: number;
  percentageScore: number;
  accuracy: number;
}

export interface DashboardUpcomingTestItem {
  paperId: number;
  paperTitle: string;
  examTag: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  studentStatus: 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
  attemptId?: string | null;
  score?: number | null;
  actionLabel: string;
  actionUrl: string;
}

export interface DashboardRecommendationItem {
  id: string;
  category: 'COURSE' | 'REVISION' | 'VIDEO' | 'TEST' | 'WELCOME';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  reason: string;
  actionLabel: string;
  actionUrl: string;
}

export interface DashboardStreakMetrics {
  currentStreakDays: number;
  longestStreakDays: number;
  activeDaysCount: number;
  studyTimeMinutes: number;
  recentActiveDates: string[];
}

export interface DashboardActivityItem {
  id: string;
  type: 'VIDEO' | 'DOCUMENT' | 'TOPIC' | 'TEST';
  title: string;
  courseTitle?: string | null;
  subjectName?: string | null;
  timestamp: string;
  details?: string | null;
  link?: string | null;
}

export interface DashboardRecentDoubtItem {
  id: number;
  courseTitle: string;
  subject?: string;
  queryText: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  solutionText?: string | null;
}

export interface StudentDashboardDTO {
  student: DashboardStudentProfile;
  overview: DashboardOverviewMetrics;
  continueLearning: DashboardContinueLearning | null;
  courses: {
    enrolledCount: number;
    enrolledCourses: DashboardCourseProgressItem[];
  };
  contentProgress: DashboardContentProgressMetrics;
  testAnalytics: {
    completedCount: number;
    inProgressCount: number;
    latestScore: DashboardLatestScore | null;
    bestScore: {
      attemptId: string;
      paperTitle: string;
      finalScore: number;
      maximumMarks: number;
      percentageScore: number;
    } | null;
    recentResults: DashboardRecentTestItem[];
    scoreTrend: DashboardScoreTrendItem[];
    subjectWisePerformance: DashboardSubjectPerformanceItem[];
  };
  // Backward compatibility alias for existing consumers
  tests: {
    completedCount: number;
    inProgressCount: number;
    latestScore: DashboardLatestScore | null;
    recentResults: DashboardRecentTestItem[];
  };
  upcomingTests: DashboardUpcomingTestItem[];
  recommendations: DashboardRecommendationItem[];
  streak: DashboardStreakMetrics;
  recentActivity: DashboardActivityItem[];
  doubts: {
    totalCount: number;
    pendingCount: number;
    resolvedCount: number;
    recentDoubts: DashboardRecentDoubtItem[];
  };
  notes?: {
    totalCount: number;
    pinnedCount: number;
    courseCount: number;
  };
  limitations: {
    courseProgressTracking: 'FULLY_SUPPORTED_POSTGRESQL_16';
    recentCourseAccessTracking: 'FULLY_SUPPORTED_POSTGRESQL_16';
  };
}

/**
 * Retrieves authoritative, database-backed dashboard information for a specific student.
 * Scopes queries strictly to the authenticated userId.
 */
export async function getStudentDashboardData(userId: number): Promise<StudentDashboardDTO | null> {
  const numericUserId = Number(userId);
  if (isNaN(numericUserId) || numericUserId <= 0) {
    return null;
  }

  // 1. Authoritative Student Identity from SQLite Auth DB
  const user = AuthDb.findUserById(numericUserId);
  if (!user) {
    return null;
  }

  const studentProfile: DashboardStudentProfile = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    mobileNumber: user.mobileNumber || null,
    targetExam: user.targetExam || null,
    role: user.role,
    createdAt: user.createdAt,
  };

  // 2. Authoritative Enrolled Courses from PostgreSQL Commerce Layer
  const coursesData = await getStudentCoursesData(numericUserId);
  const settledEnrollments = coursesData.courses.filter(
    (c) => ['SETTLED', 'UNVERIFIED_HISTORICAL'].includes(c.settlementStatus) && ['ACTIVE', 'PROVISIONED'].includes(c.accessState)
  );

  // 3. Aggregate Course Progress using LearningProgressService
  const allVideos = readVideosFromDb().filter((v) => v.status === 'Published');
  const allDocuments = readDocumentsFromDb().filter((d) => d.status === 'Published');
  const allChapters = readChaptersFromDb();

  const getCourseIdForVideo = (video: any): number => {
    if (video.courseId) return Number(video.courseId);
    const ch = allChapters.find(
      (c) =>
        c.id === (video as any).chapterId ||
        c.chapterName.trim().toLowerCase() === String(video.chapter || '').trim().toLowerCase()
    );
    return ch ? Number(ch.courseId) : 1;
  };

  const getCourseIdForDocument = (doc: any): number => {
    if (doc.courseId) return Number(doc.courseId);
    const ch = allChapters.find(
      (c) =>
        c.id === (doc as any).chapterId ||
        c.chapterName.trim().toLowerCase() === String(doc.chapter || '').trim().toLowerCase()
    );
    return ch ? Number(ch.courseId) : 1;
  };

  const enrolledCourseProgressList: DashboardCourseProgressItem[] = [];

  let totalAllTopics = 0;
  let completedAllTopics = 0;
  let completedCoursesCount = 0;
  let mostRecentCourseActivity: {
    course: DashboardCourseProgressItem;
    lastActivityAt: string;
    location: any;
  } | null = null;

  for (const c of settledEnrollments) {
    const courseIdNum = Number(c.courseId);
    let progressSummary: any = null;

    try {
      progressSummary = await LearningProgressService.getStudentCourseProgressSummary(
        numericUserId,
        courseIdNum
      );
    } catch (err) {
      console.error(`[StudentDashboard] Error fetching progress for course ${courseIdNum}:`, err);
    }

    const courseVideos = allVideos.filter((v) => getCourseIdForVideo(v) === courseIdNum);
    const courseDocuments = allDocuments.filter((d) => getCourseIdForDocument(d) === courseIdNum);

    const progressPct = progressSummary ? progressSummary.courseCompletionPercentage : 0;
    const totalTopics = progressSummary ? progressSummary.totalTopics : 0;
    const completedTopics = progressSummary ? progressSummary.completedTopics : 0;
    const totalChapters = progressSummary ? progressSummary.totalChapters : 0;
    const completedChapters = progressSummary ? progressSummary.completedChapters : 0;
    const lastActivity = progressSummary?.lastActivityAt || null;

    totalAllTopics += totalTopics;
    completedAllTopics += completedTopics;

    if (totalTopics > 0 && completedTopics >= totalTopics) {
      completedCoursesCount++;
    }

    const item: DashboardCourseProgressItem = {
      enrollmentId: c.enrollmentId,
      courseId: courseIdNum,
      title: c.title,
      slug: c.slug,
      examTag: c.examTag,
      image: c.image,
      enrolledAt: c.enrolledAt,
      accessState: c.accessState,
      progressPercentage: progressPct,
      totalChapters,
      completedChapters,
      totalTopics,
      completedTopics,
      totalVideos: courseVideos.length,
      completedVideos: 0, // Populated via content progress below
      totalDocuments: courseDocuments.length,
      completedDocuments: 0, // Populated via content progress below
      lastActivityAt: lastActivity,
      continueUrl: `/student/courses/${courseIdNum}`,
    };

    enrolledCourseProgressList.push(item);

    if (lastActivity) {
      if (!mostRecentCourseActivity || new Date(lastActivity) > new Date(mostRecentCourseActivity.lastActivityAt)) {
        mostRecentCourseActivity = {
          course: item,
          lastActivityAt: lastActivity,
          location: progressSummary?.lastAccessedLocation || null,
        };
      }
    }
  }

  // 4. Query PostgreSQL Learning Schema for Content Progress (Videos & Documents)
  let videoProgressRows: any[] = [];
  let learningEventsRows: any[] = [];
  try {
    const db = await getCommerceDb();
    const contentRes = await db.query(
      `SELECT content_type, content_identifier, status, course_id, last_activity_at, completed_at
       FROM learning.student_content_progress
       WHERE user_id = $1;`,
      [numericUserId]
    );
    videoProgressRows = contentRes.rows || [];

    const eventsRes = await db.query(
      `SELECT id, course_id, event_type, content_type, content_identifier, subject_id, chapter_id, topic_id, event_at
       FROM learning.student_learning_events
       WHERE user_id = $1
       ORDER BY event_at DESC
       LIMIT 50;`,
      [numericUserId]
    );
    learningEventsRows = eventsRes.rows || [];
  } catch (dbErr) {
    console.error('[StudentDashboard] Error querying content progress / events:', dbErr);
  }

  // Video progress calculations
  const eligibleCourseIds = settledEnrollments.map((c) => Number(c.courseId));
  const eligibleVideos = allVideos.filter((v) => eligibleCourseIds.includes(getCourseIdForVideo(v)));
  const completedVideoIds = new Set(
    videoProgressRows
      .filter((r) => r.content_type === 'VIDEO' && r.status === 'COMPLETED')
      .map((r) => String(r.content_identifier))
  );

  const completedVideosCount = eligibleVideos.filter((v) =>
    completedVideoIds.has(String(v.id)) || completedVideoIds.has(String(v.vimeoVideoId))
  ).length;

  const totalVideosCount = eligibleVideos.length;
  const remainingVideosCount = Math.max(0, totalVideosCount - completedVideosCount);
  const videoCompletionPercentage =
    totalVideosCount > 0 ? Number(((completedVideosCount / totalVideosCount) * 100).toFixed(1)) : 0;

  // Document progress calculations
  const eligibleDocs = allDocuments.filter((d) => eligibleCourseIds.includes(getCourseIdForDocument(d)));
  const completedDocIds = new Set(
    videoProgressRows
      .filter((r) => r.content_type === 'PDF' && r.status === 'COMPLETED')
      .map((r) => String(r.content_identifier))
  );

  const completedDocsCount = eligibleDocs.filter((d) => completedDocIds.has(String(d.id))).length;
  const totalDocsCount = eligibleDocs.length;
  const remainingDocsCount = Math.max(0, totalDocsCount - completedDocsCount);
  const docCompletionPercentage =
    totalDocsCount > 0 ? Number(((completedDocsCount / totalDocsCount) * 100).toFixed(1)) : 0;

  // Update completed content on each course card
  for (const courseItem of enrolledCourseProgressList) {
    const cVideos = allVideos.filter((v) => getCourseIdForVideo(v) === courseItem.courseId);
    courseItem.completedVideos = cVideos.filter((v) =>
      completedVideoIds.has(String(v.id)) || completedVideoIds.has(String(v.vimeoVideoId))
    ).length;

    const cDocs = allDocuments.filter((d) => getCourseIdForDocument(d) === courseItem.courseId);
    courseItem.completedDocuments = cDocs.filter((d) => completedDocIds.has(String(d.id))).length;
  }

  // Recent video & document activity
  const recentVideos = videoProgressRows
    .filter((r) => r.content_type === 'VIDEO')
    .slice(0, 5)
    .map((r) => {
      const v = allVideos.find((vid) => String(vid.id) === r.content_identifier || String(vid.vimeoVideoId) === r.content_identifier);
      const course = enrolledCourseProgressList.find((c) => c.courseId === Number(r.course_id));
      return {
        id: v ? Number(v.id) : 0,
        title: v ? v.title : `Video #${r.content_identifier}`,
        courseTitle: course ? course.title : 'Course Lesson',
        durationMinutes: v ? Number(v.durationMinutes || 0) : 0,
        status: (r.status as 'IN_PROGRESS' | 'COMPLETED'),
        lastActivityAt: new Date(r.last_activity_at).toISOString(),
      };
    });

  const recentDocuments = videoProgressRows
    .filter((r) => r.content_type === 'PDF')
    .slice(0, 5)
    .map((r) => {
      const d = allDocuments.find((doc) => String(doc.id) === r.content_identifier);
      const course = enrolledCourseProgressList.find((c) => c.courseId === Number(r.course_id));
      return {
        id: d ? Number(d.id) : 0,
        title: d ? d.title : `Document #${r.content_identifier}`,
        courseTitle: course ? course.title : 'Study Material',
        fileType: d ? (d.fileType || 'PDF') : 'PDF',
        status: (r.status === 'COMPLETED' ? 'COMPLETED' : 'OPENED') as 'OPENED' | 'COMPLETED',
        lastActivityAt: new Date(r.last_activity_at).toISOString(),
      };
    });

  // Overall progress percentage
  const overallProgressPercentage =
    totalAllTopics > 0 ? Number(((completedAllTopics / totalAllTopics) * 100).toFixed(1)) : 0;

  // 5. Build Continue Learning Target
  let continueLearning: DashboardContinueLearning | null = null;
  const targetCourseItem = mostRecentCourseActivity
    ? mostRecentCourseActivity.course
    : enrolledCourseProgressList.length > 0
    ? enrolledCourseProgressList[0]
    : null;

  if (targetCourseItem) {
    const allSubjects = readSubjectsFromDb();
    const allChapters = readChaptersFromDb();
    const loc = mostRecentCourseActivity?.location;

    let subName: string | null = null;
    let chName: string | null = null;

    if (loc?.subjectId) {
      const s = allSubjects.find((sub) => Number(sub.id) === loc.subjectId);
      subName = s ? s.subjectName : null;
    }
    if (loc?.chapterId) {
      const ch = allChapters.find((chap) => Number(chap.id) === loc.chapterId);
      chName = ch ? ch.chapterName : null;
    }

    continueLearning = {
      courseId: targetCourseItem.courseId,
      courseTitle: targetCourseItem.title,
      courseSlug: targetCourseItem.slug,
      courseImage: targetCourseItem.image,
      examTag: targetCourseItem.examTag,
      subjectName: subName,
      chapterName: chName,
      lessonTitle: chName ? `Chapter: ${chName}` : 'Resume Curriculum',
      lessonType: 'TOPIC',
      progressPercentage: targetCourseItem.progressPercentage,
      lastActivityAt: targetCourseItem.lastActivityAt || targetCourseItem.enrolledAt,
      resumeUrl: targetCourseItem.continueUrl,
    };
  }

  // 6. Authoritative Test Attempts & Scores (Feature 07 data)
  const allAttempts = readTestAttemptsFromDb();
  const studentAttempts = allAttempts.filter((a) => Number(a.studentId) === numericUserId);

  const completedAttempts = studentAttempts
    .filter((a) => a.status === 'COMPLETED' && a.result)
    .sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.result?.submittedAt || a.createdAt).getTime();
      const timeB = new Date(b.submittedAt || b.result?.submittedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  const inProgressAttempts = studentAttempts.filter((a) => a.status === 'IN_PROGRESS');

  // Derive latest completed test result
  let latestScore: DashboardLatestScore | null = null;
  if (completedAttempts.length > 0) {
    const top = completedAttempts[0];
    const res = top.result!;
    const pct = res.maximumMarks > 0 ? Number(((res.finalScore / res.maximumMarks) * 100).toFixed(2)) : 0;

    latestScore = {
      attemptId: top.id,
      paperId: top.paperId,
      paperTitle: top.paperTitle,
      examTag: top.examTag,
      submittedAt: top.submittedAt || res.submittedAt,
      finalScore: res.finalScore,
      maximumMarks: res.maximumMarks,
      percentageScore: pct,
      accuracy: res.accuracy,
      submissionReason: top.submissionReason || res.submissionReason || 'MANUAL',
    };
  }

  // Best score
  let bestScore: {
    attemptId: string;
    paperTitle: string;
    finalScore: number;
    maximumMarks: number;
    percentageScore: number;
  } | null = null;

  if (completedAttempts.length > 0) {
    let highestAttempt = completedAttempts[0];
    let highestScore = highestAttempt.result!.finalScore;

    for (const a of completedAttempts) {
      if (a.result!.finalScore > highestScore) {
        highestScore = a.result!.finalScore;
        highestAttempt = a;
      }
    }

    const hRes = highestAttempt.result!;
    bestScore = {
      attemptId: highestAttempt.id,
      paperTitle: highestAttempt.paperTitle,
      finalScore: hRes.finalScore,
      maximumMarks: hRes.maximumMarks,
      percentageScore: hRes.maximumMarks > 0 ? Number(((hRes.finalScore / hRes.maximumMarks) * 100).toFixed(2)) : 0,
    };
  }

  // Derive average metrics across completed tests
  let averageScorePercentage: number | null = null;
  let averageAccuracy: number | null = null;

  if (completedAttempts.length > 0) {
    let totalScorePct = 0;
    let totalAcc = 0;

    completedAttempts.forEach((a) => {
      const res = a.result!;
      const pct = res.maximumMarks > 0 ? (res.finalScore / res.maximumMarks) * 100 : 0;
      totalScorePct += pct;
      totalAcc += res.accuracy || 0;
    });

    averageScorePercentage = Number((totalScorePct / completedAttempts.length).toFixed(2));
    averageAccuracy = Number((totalAcc / completedAttempts.length).toFixed(2));
  }

  // Chronological score trend for performance graphing
  const scoreTrend: DashboardScoreTrendItem[] = [...completedAttempts]
    .sort((a, b) => {
      const tA = new Date(a.submittedAt || a.result?.submittedAt || a.startedAt).getTime();
      const tB = new Date(b.submittedAt || b.result?.submittedAt || b.startedAt).getTime();
      return tA - tB;
    })
    .map((a) => {
      const res = a.result!;
      return {
        attemptId: a.id,
        paperId: a.paperId,
        paperTitle: a.paperTitle,
        examTag: a.examTag,
        submittedAt: a.submittedAt || res.submittedAt,
        finalScore: res.finalScore,
        maximumMarks: res.maximumMarks,
        percentageScore: res.maximumMarks > 0 ? Number(((res.finalScore / res.maximumMarks) * 100).toFixed(2)) : 0,
        accuracy: res.accuracy,
      };
    });

  // Recent test results (top 5)
  const recentResults: DashboardRecentTestItem[] = studentAttempts
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5)
    .map((a) => {
      const res = a.result;
      const pct = res && res.maximumMarks > 0 ? Number(((res.finalScore / res.maximumMarks) * 100).toFixed(2)) : null;

      return {
        attemptId: a.id,
        paperId: a.paperId,
        paperTitle: a.paperTitle,
        examTag: a.examTag,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt || res?.submittedAt || null,
        finalScore: res ? res.finalScore : null,
        maximumMarks: res ? res.maximumMarks : a.totalMarks,
        percentageScore: pct,
        accuracy: res ? res.accuracy : null,
      };
    });

  // Subject-wise performance aggregation across completed tests
  const masterQuestions = readQuestionsFromDb();
  const masterSubjects = readSubjectsFromDb();
  const qSubjectMap = new Map<number, number>();
  for (const q of masterQuestions) {
    if (q.subjectId) qSubjectMap.set(Number(q.id), Number(q.subjectId));
  }

  const subjectPerfMap = new Map<
    number,
    { attempted: number; correct: number; incorrect: number; marks: number; maxMarks: number }
  >();

  for (const att of completedAttempts) {
    const qDetails = att.result?.questionDetails || [];
    for (const qd of qDetails) {
      const sId = qSubjectMap.get(Number(qd.questionId)) || 1;
      const cur = subjectPerfMap.get(sId) || { attempted: 0, correct: 0, incorrect: 0, marks: 0, maxMarks: 0 };

      if (qd.evaluationStatus !== 'UNATTEMPTED') {
        cur.attempted++;
        if (qd.evaluationStatus === 'CORRECT') cur.correct++;
        if (qd.evaluationStatus === 'INCORRECT') cur.incorrect++;
      }
      cur.marks += qd.marksAwarded || 0;
      cur.maxMarks += 3; // Standard question max marks default
      subjectPerfMap.set(sId, cur);
    }
  }

  const subjectWisePerformance: DashboardSubjectPerformanceItem[] = [];
  subjectPerfMap.forEach((perf, sId) => {
    const sObj = masterSubjects.find((s) => Number(s.id) === sId);
    const sName = sObj ? sObj.subjectName : `Subject #${sId}`;
    const totalAttempted = perf.correct + perf.incorrect;
    const accuracy = totalAttempted > 0 ? Number(((perf.correct / totalAttempted) * 100).toFixed(1)) : 0;

    subjectWisePerformance.push({
      subjectId: sId,
      subjectName: sName,
      questionsAttempted: perf.attempted,
      correctQuestions: perf.correct,
      incorrectQuestions: perf.incorrect,
      marksObtained: perf.marks,
      maximumMarks: perf.maxMarks,
      accuracy,
    });
  });

  // 7. Published Test Series & Student Status (Feature 06 Integration)
  const publishedPapers = readTestSeriesFromDb().filter((t) => t.status === 'Published');
  const upcomingTests: DashboardUpcomingTestItem[] = publishedPapers.map((paper) => {
    const myAttempts = studentAttempts.filter((a) => Number(a.paperId) === Number(paper.id));
    const activeAtt = myAttempts.find((a) => a.status === 'IN_PROGRESS');
    const compAtt = myAttempts.find((a) => a.status === 'COMPLETED');

    if (activeAtt) {
      return {
        paperId: Number(paper.id),
        paperTitle: paper.title,
        examTag: paper.examTag || 'Mock',
        durationMinutes: Number(paper.durationMinutes || 180),
        totalQuestions: Number(paper.totalQuestions || 0),
        totalMarks: Number(paper.totalMarks || 0),
        studentStatus: 'IN_PROGRESS',
        attemptId: activeAtt.id,
        actionLabel: 'Resume Test',
        actionUrl: `/student/tests/session/${encodeURIComponent(activeAtt.id)}`,
      };
    } else if (compAtt) {
      return {
        paperId: Number(paper.id),
        paperTitle: paper.title,
        examTag: paper.examTag || 'Mock',
        durationMinutes: Number(paper.durationMinutes || 180),
        totalQuestions: Number(paper.totalQuestions || 0),
        totalMarks: Number(paper.totalMarks || 0),
        studentStatus: 'COMPLETED',
        attemptId: compAtt.id,
        score: compAtt.result?.finalScore ?? null,
        actionLabel: 'View Scorecard',
        actionUrl: `/student/tests/results/${encodeURIComponent(compAtt.id)}`,
      };
    } else {
      return {
        paperId: Number(paper.id),
        paperTitle: paper.title,
        examTag: paper.examTag || 'Mock',
        durationMinutes: Number(paper.durationMinutes || 180),
        totalQuestions: Number(paper.totalQuestions || 0),
        totalMarks: Number(paper.totalMarks || 0),
        studentStatus: 'AVAILABLE',
        actionLabel: 'Start Test',
        actionUrl: `/student/tests/${paper.id}`,
      };
    }
  });

  // 8. Learning Streak & Study Time Calculation
  const activeDateSet = new Set<string>();
  for (const ev of learningEventsRows) {
    if (ev.event_at) {
      activeDateSet.add(new Date(ev.event_at).toISOString().split('T')[0]);
    }
  }
  for (const att of studentAttempts) {
    if (att.startedAt) {
      activeDateSet.add(new Date(att.startedAt).toISOString().split('T')[0]);
    }
    if (att.submittedAt) {
      activeDateSet.add(new Date(att.submittedAt).toISOString().split('T')[0]);
    }
  }

  const sortedDates = Array.from(activeDateSet).sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  let currentStreakDays = 0;
  if (sortedDates.length > 0) {
    let checkDate = new Date();
    if (!activeDateSet.has(todayStr)) {
      if (activeDateSet.has(yesterdayStr)) {
        checkDate = yesterdayDate;
      } else {
        checkDate = new Date(0); // broken streak
      }
    }

    if (checkDate.getTime() > 0) {
      while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (activeDateSet.has(dStr)) {
          currentStreakDays++;
          checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
        } else {
          break;
        }
      }
    }
  }

  // Calculate total study time: completed video durations + completed test durations
  let studyTimeMinutes = 0;
  for (const vid of eligibleVideos) {
    if (completedVideoIds.has(String(vid.id)) || completedVideoIds.has(String(vid.vimeoVideoId))) {
      studyTimeMinutes += Number(vid.durationMinutes || 0);
    }
  }
  for (const att of completedAttempts) {
    if (att.startedAt && att.submittedAt) {
      const durMin = Math.round(
        (new Date(att.submittedAt).getTime() - new Date(att.startedAt).getTime()) / 60000
      );
      if (durMin > 0 && durMin < 600) {
        studyTimeMinutes += durMin;
      }
    }
  }

  // 9. Personalized Learning Recommendations (Rule-based)
  const recommendations: DashboardRecommendationItem[] = [];

  // Rec 1: Resume unfinished enrolled course
  const incompleteCourse = enrolledCourseProgressList.find((c) => c.progressPercentage > 0 && c.progressPercentage < 100);
  if (incompleteCourse) {
    recommendations.push({
      id: `rec_course_${incompleteCourse.courseId}`,
      category: 'COURSE',
      priority: 'HIGH',
      title: `Continue ${incompleteCourse.title}`,
      reason: `You have completed ${incompleteCourse.completedTopics} of ${incompleteCourse.totalTopics} topics (${incompleteCourse.progressPercentage}%). Keep your momentum going!`,
      actionLabel: 'Resume Course',
      actionUrl: incompleteCourse.continueUrl,
    });
  }

  // Rec 2: Weak subject revision based on test accuracy
  const weakSubject = subjectWisePerformance.find((s) => s.questionsAttempted >= 1 && s.accuracy < 60);
  if (weakSubject) {
    recommendations.push({
      id: `rec_weak_sub_${weakSubject.subjectId}`,
      category: 'REVISION',
      priority: 'HIGH',
      title: `Revise ${weakSubject.subjectName}`,
      reason: `Your test accuracy in ${weakSubject.subjectName} is currently ${weakSubject.accuracy}%. Revisit video lessons and study materials to strengthen core concepts.`,
      actionLabel: 'Review Lessons',
      actionUrl: targetCourseItem ? targetCourseItem.continueUrl : '/student/courses',
    });
  }

  // Rec 3: Finish in-progress video
  const inProgVideo = recentVideos.find((v) => v.status === 'IN_PROGRESS');
  if (inProgVideo && targetCourseItem) {
    recommendations.push({
      id: `rec_video_${inProgVideo.id}`,
      category: 'VIDEO',
      priority: 'MEDIUM',
      title: `Finish Watching: ${inProgVideo.title}`,
      reason: `You started this video lecture (${inProgVideo.courseTitle}). Complete it to mark the lesson finished.`,
      actionLabel: 'Watch Video',
      actionUrl: targetCourseItem.continueUrl,
    });
  }

  // Rec 4: Practice test recommendation
  const unattemptedTest = upcomingTests.find((t) => t.studentStatus === 'AVAILABLE');
  if (unattemptedTest) {
    recommendations.push({
      id: `rec_test_${unattemptedTest.paperId}`,
      category: 'TEST',
      priority: 'MEDIUM',
      title: `Practice ${unattemptedTest.paperTitle}`,
      reason: `Simulate actual ${unattemptedTest.examTag} CBT conditions (${unattemptedTest.durationMinutes} mins) and assess your readiness.`,
      actionLabel: 'Start Mock Paper',
      actionUrl: unattemptedTest.actionUrl,
    });
  }

  // Fallback: Welcome recommendation if no specific recommendations
  if (recommendations.length === 0) {
    if (enrolledCourseProgressList.length > 0) {
      recommendations.push({
        id: 'rec_welcome',
        category: 'WELCOME',
        priority: 'LOW',
        title: `Explore ${enrolledCourseProgressList[0].title}`,
        reason: 'Start your study sessions today. Watch HD lectures, download notes, and test yourself with mock papers.',
        actionLabel: 'Start Learning',
        actionUrl: enrolledCourseProgressList[0].continueUrl,
      });
    } else {
      recommendations.push({
        id: 'rec_catalog',
        category: 'WELCOME',
        priority: 'LOW',
        title: 'Explore 10Q Challenge Crash Courses',
        reason: 'Accelerate your BITSAT and JEE Main preparation with comprehensive video lectures, curated notes, and CBT mock tests.',
        actionLabel: 'Browse Courses',
        actionUrl: '/course-all',
      });
    }
  }

  // 10. Unified Recent Activity Feed
  const activityItems: DashboardActivityItem[] = [];

  for (const ev of learningEventsRows) {
    let type: DashboardActivityItem['type'] = 'TOPIC';
    let title = 'Learning Event';
    let details: string | null = null;
    let link: string | null = null;

    if (ev.event_type.startsWith('VIDEO')) {
      type = 'VIDEO';
      const v = allVideos.find((vid) => String(vid.id) === ev.content_identifier || String(vid.vimeoVideoId) === ev.content_identifier);
      title = ev.event_type === 'VIDEO_COMPLETED' ? `Completed Video: ${v?.title || 'Video'}` : `Watched Video: ${v?.title || 'Video'}`;
      link = `/student/courses/${ev.course_id}`;
    } else if (ev.event_type.startsWith('DOCUMENT')) {
      type = 'DOCUMENT';
      const d = allDocuments.find((doc) => String(doc.id) === ev.content_identifier);
      title = ev.event_type === 'DOCUMENT_COMPLETED' ? `Read Document: ${d?.title || 'Study Material'}` : `Opened Document: ${d?.title || 'Study Material'}`;
      link = `/student/courses/${ev.course_id}`;
    } else {
      type = 'TOPIC';
      title = ev.event_type === 'TOPIC_COMPLETED' ? 'Completed Syllabus Topic' : 'Studied Topic';
      link = `/student/courses/${ev.course_id}`;
    }

    const cObj = enrolledCourseProgressList.find((c) => c.courseId === Number(ev.course_id));

    activityItems.push({
      id: `act_ev_${ev.id}`,
      type,
      title,
      courseTitle: cObj?.title || null,
      timestamp: new Date(ev.event_at).toISOString(),
      details,
      link,
    });
  }

  for (const att of studentAttempts) {
    if (att.status === 'COMPLETED' && att.submittedAt) {
      activityItems.push({
        id: `act_att_comp_${att.id}`,
        type: 'TEST',
        title: `Submitted Mock: ${att.paperTitle}`,
        courseTitle: `${att.examTag} CBT Series`,
        timestamp: new Date(att.submittedAt).toISOString(),
        details: `Score: ${att.result?.finalScore ?? 0} / ${att.result?.maximumMarks ?? att.totalMarks} (${att.result?.accuracy ?? 0}% accuracy)`,
        link: `/student/tests/results/${encodeURIComponent(att.id)}`,
      });
    } else if (att.status === 'IN_PROGRESS') {
      activityItems.push({
        id: `act_att_prog_${att.id}`,
        type: 'TEST',
        title: `Started Mock: ${att.paperTitle}`,
        courseTitle: `${att.examTag} CBT Series`,
        timestamp: new Date(att.startedAt).toISOString(),
        details: 'Attempt currently in progress',
        link: `/student/tests/session/${encodeURIComponent(att.id)}`,
      });
    }
  }

  // Deduplicate and sort descending by timestamp
  const sortedActivity = activityItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // 11. Authoritative Student Doubts
  let totalDoubtsCount = 0;
  let pendingDoubtsCount = 0;
  let resolvedDoubtsCount = 0;
  let recentDoubts: DashboardRecentDoubtItem[] = [];

  try {
    const { DoubtService } = await import('@/lib/doubts/service');
    const doubtsRes = await DoubtService.getStudentDoubts(numericUserId);
    const metrics = await DoubtService.getStudentMetrics(numericUserId);
    totalDoubtsCount = metrics.total;
    pendingDoubtsCount = metrics.open + metrics.inProgress;
    resolvedDoubtsCount = metrics.resolved;
    recentDoubts = doubtsRes.slice(0, 3).map((d) => ({
      id: d.id,
      courseTitle: d.courseTitle,
      subject: d.subjectName || undefined,
      queryText: d.description || d.title,
      status: (d.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING') as 'RESOLVED' | 'PENDING',
      createdAt: d.createdAt,
      solutionText: null,
    }));
  } catch {
    const studentDoubts: DoubtRecord[] = getStudentDoubts(numericUserId);
    totalDoubtsCount = studentDoubts.length;
    pendingDoubtsCount = studentDoubts.filter((d) => d.status === 'PENDING').length;
    resolvedDoubtsCount = studentDoubts.filter((d) => d.status === 'RESOLVED').length;
    recentDoubts = studentDoubts.slice(0, 3).map((d) => ({
      id: d.id,
      courseTitle: d.courseTitle,
      subject: d.subject,
      queryText: d.queryText,
      status: d.status,
      createdAt: d.createdAt,
      solutionText: d.solutionText || null,
    }));
  }

  // 12. Authoritative Student Notes Metrics
  let notesMetrics = { total: 0, pinned: 0, courseCount: 0 };
  try {
    const { StudentNotesService } = await import('@/lib/notes/service');
    notesMetrics = await StudentNotesService.getNotesMetrics(numericUserId);
  } catch {}

  // Assemble full DTO
  return {
    student: studentProfile,
    overview: {
      enrolledCoursesCount: enrolledCourseProgressList.length,
      completedCoursesCount,
      overallProgressPercentage,
      lessonsCompletedCount: completedAllTopics + completedVideosCount + completedDocsCount,
      completedTestsCount: completedAttempts.length,
      attemptedTestsCount: studentAttempts.length,
      availableTestsCount: publishedPapers.length,
      averageScorePercentage,
      averageAccuracy,
      studyTimeMinutes,
      currentStreakDays,
      totalDoubtsCount,
      pendingDoubtsCount,
      resolvedDoubtsCount,
    },
    continueLearning,
    courses: {
      enrolledCount: enrolledCourseProgressList.length,
      enrolledCourses: enrolledCourseProgressList,
    },
    contentProgress: {
      totalVideos: totalVideosCount,
      completedVideos: completedVideosCount,
      remainingVideos: remainingVideosCount,
      videoCompletionPercentage,
      totalDocuments: totalDocsCount,
      completedDocuments: completedDocsCount,
      remainingDocuments: remainingDocsCount,
      documentCompletionPercentage: docCompletionPercentage,
      recentVideos,
      recentDocuments,
    },
    testAnalytics: {
      completedCount: completedAttempts.length,
      inProgressCount: inProgressAttempts.length,
      latestScore,
      bestScore,
      recentResults,
      scoreTrend,
      subjectWisePerformance,
    },
    tests: {
      completedCount: completedAttempts.length,
      inProgressCount: inProgressAttempts.length,
      latestScore,
      recentResults,
    },
    upcomingTests,
    recommendations,
    streak: {
      currentStreakDays,
      longestStreakDays: Math.max(currentStreakDays, sortedDates.length),
      activeDaysCount: activeDateSet.size,
      studyTimeMinutes,
      recentActiveDates: sortedDates.slice(0, 14),
    },
    recentActivity: sortedActivity,
    doubts: {
      totalCount: totalDoubtsCount,
      pendingCount: pendingDoubtsCount,
      resolvedCount: resolvedDoubtsCount,
      recentDoubts,
    },
    notes: {
      totalCount: notesMetrics.total,
      pinnedCount: notesMetrics.pinned,
      courseCount: notesMetrics.courseCount,
    },
    limitations: {
      courseProgressTracking: 'FULLY_SUPPORTED_POSTGRESQL_16',
      recentCourseAccessTracking: 'FULLY_SUPPORTED_POSTGRESQL_16',
    },
  };
}
