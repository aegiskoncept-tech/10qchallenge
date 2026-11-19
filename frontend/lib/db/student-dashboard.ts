// ==============================================================================
// 10Q CHALLENGE LMS — STUDENT DASHBOARD DATA ACCESS LAYER
// Authoritative aggregation of student profile, test attempts, courses & doubts
// ==============================================================================

import { AuthDb } from '@/lib/auth/database';
import { readTestAttemptsFromDb, TestAttemptRecord } from './test-attempts';
import { getStudentDoubts, DoubtRecord } from './doubts';
import { readTestSeriesFromDb } from './test-series';
import { getCourseBySlugOrId } from './courses';
import { getCommerceDb } from '@/lib/commerce/db';
import { getStudentCoursesData } from './student-courses';

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
  completedTestsCount: number;
  attemptedTestsCount: number;
  totalDoubtsCount: number;
  pendingDoubtsCount: number;
  resolvedDoubtsCount: number;
  availableTestsCount: number;
  averageScorePercentage: number | null;
  averageAccuracy: number | null;
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

export interface DashboardEnrolledCourseItem {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  examTag: string;
  image: string | null;
  enrolledAt: string;
  accessState: string;
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
  tests: {
    completedCount: number;
    inProgressCount: number;
    latestScore: DashboardLatestScore | null;
    recentResults: DashboardRecentTestItem[];
  };
  courses: {
    enrolledCount: number;
    enrolledCourses: DashboardEnrolledCourseItem[];
  };
  doubts: {
    totalCount: number;
    pendingCount: number;
    resolvedCount: number;
    recentDoubts: DashboardRecentDoubtItem[];
  };
  limitations: {
    courseProgressTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA';
    recentCourseAccessTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA';
  };
}

/**
 * Retrieves authoritative, database-backed dashboard information for a specific student.
 * Never trusts client input; scopes queries strictly to the authenticated userId.
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

  // 2. Authoritative Test Attempts & Scores
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
    const pct = res.maximumMarks > 0
      ? Number(((res.finalScore / res.maximumMarks) * 100).toFixed(2))
      : 0;

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

  // Recent test results (top 5 sorted by latest activity)
  const recentResults: DashboardRecentTestItem[] = studentAttempts
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5)
    .map((a) => {
      const res = a.result;
      const pct = res && res.maximumMarks > 0
        ? Number(((res.finalScore / res.maximumMarks) * 100).toFixed(2))
        : null;

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

  // 3. Authoritative Enrolled Courses from PostgreSQL Commerce Layer via shared student-courses data-access layer
  const coursesData = await getStudentCoursesData(numericUserId);
  const enrolledCourses: DashboardEnrolledCourseItem[] = coursesData.courses
    .filter((c) => c.settlementStatus === 'SETTLED' && ['ACTIVE', 'PROVISIONED'].includes(c.accessState))
    .map((c) => ({
      enrollmentId: c.enrollmentId,
      courseId: c.courseId,
      title: c.title,
      slug: c.slug,
      examTag: c.examTag,
      image: c.image,
      enrolledAt: c.enrolledAt,
      accessState: c.accessState,
    }));

  // 4. Authoritative Student Doubts
  const studentDoubts: DoubtRecord[] = getStudentDoubts(numericUserId);
  const totalDoubtsCount = studentDoubts.length;
  const pendingDoubtsCount = studentDoubts.filter((d) => d.status === 'PENDING').length;
  const resolvedDoubtsCount = studentDoubts.filter((d) => d.status === 'RESOLVED').length;

  const recentDoubts: DashboardRecentDoubtItem[] = studentDoubts.slice(0, 3).map((d) => ({
    id: d.id,
    courseTitle: d.courseTitle,
    subject: d.subject,
    queryText: d.queryText,
    status: d.status,
    createdAt: d.createdAt,
    solutionText: d.solutionText || null,
  }));

  // 5. Canonical Available Tests Count
  const availableTestsCount = readTestSeriesFromDb().filter((t) => t.status === 'Published').length;

  return {
    student: studentProfile,
    overview: {
      enrolledCoursesCount: enrolledCourses.length,
      completedTestsCount: completedAttempts.length,
      attemptedTestsCount: studentAttempts.length,
      totalDoubtsCount,
      pendingDoubtsCount,
      resolvedDoubtsCount,
      availableTestsCount,
      averageScorePercentage,
      averageAccuracy,
    },
    tests: {
      completedCount: completedAttempts.length,
      inProgressCount: inProgressAttempts.length,
      latestScore,
      recentResults,
    },
    courses: {
      enrolledCount: enrolledCourses.length,
      enrolledCourses,
    },
    doubts: {
      totalCount: totalDoubtsCount,
      pendingCount: pendingDoubtsCount,
      resolvedCount: resolvedDoubtsCount,
      recentDoubts,
    },
    limitations: {
      courseProgressTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA',
      recentCourseAccessTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA',
    },
  };
}
