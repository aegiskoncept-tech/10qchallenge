// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.3 STUDENT ENROLLED COURSES DATA ACCESS LAYER
// Authoritative aggregation of PostgreSQL 16 Commerce enrollments & Course Master
// ==============================================================================

import { getCommerceDb } from '@/lib/commerce/db';
import { getCourseBySlugOrId } from './courses';

export interface StudentCourseItemDTO {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  examTag: string;
  image: string | null;
  shortDescription?: string | null;
  enrolledAt: string;
  settlementStatus: string;
  accessState: string;
  enrollmentSource: string;
  statusLabel: string;
  statusCategory: 'ACTIVE' | 'PROVISIONING' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'UNVERIFIED' | 'UNKNOWN';
  classroomAccessEligible: false;
  classroomStatusNotice: string;
  courseDetailsUrl: string;
}

export interface StudentCoursesResponseDTO {
  courses: StudentCourseItemDTO[];
  counts: {
    totalEnrollments: number;
    settledCount: number;
    pendingCount: number;
    revokedCount: number;
  };
  limitations: {
    classroomEnforcement: 'DISABLED_IN_CURRENT_PHASE';
    courseProgressTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA';
  };
}

export const CLASSROOM_STATUS_NOTICE =
  'Your course enrollment is recorded. Classroom access will be available once access provisioning is enabled.';

/**
 * Retrieves authoritative, database-backed course enrollments for a specific student.
 * Never trusts client input; scopes queries strictly to the authenticated userId.
 */
export async function getStudentCoursesData(userId: number): Promise<StudentCoursesResponseDTO> {
  const numericUserId = Number(userId);
  if (isNaN(numericUserId) || numericUserId <= 0) {
    return {
      courses: [],
      counts: { totalEnrollments: 0, settledCount: 0, pendingCount: 0, revokedCount: 0 },
      limitations: {
        classroomEnforcement: 'DISABLED_IN_CURRENT_PHASE',
        courseProgressTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA',
      },
    };
  }

  const courses: StudentCourseItemDTO[] = [];
  let settledCount = 0;
  let pendingCount = 0;
  let revokedCount = 0;

  try {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT id, order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state, provenance_metadata
       FROM commerce.enrollments
       WHERE user_id = $1
       ORDER BY enrolled_at DESC;`,
      [numericUserId]
    );

    if (res && Array.isArray(res.rows)) {
      for (const row of res.rows) {
        const course = getCourseBySlugOrId(row.course_id);
        const title = course ? course.title : `Course #${row.course_id}`;
        const slug = course ? course.slug : String(row.course_id);
        const examTag = course ? course.exam : 'General';
        const image = course ? (course.image || course.bannerImage || null) : null;
        const shortDescription = course?.shortDescription || null;

        const settlementStatus = String(row.settlement_status || '').toUpperCase();
        const accessState = String(row.access_state || '').toUpperCase();
        const enrollmentSource = String(row.enrollment_source || '');

        let statusLabel = 'Enrolled';
        let statusCategory: StudentCourseItemDTO['statusCategory'] = 'UNKNOWN';

        if (settlementStatus === 'REVERSED') {
          revokedCount++;
          statusLabel = 'Payment Reversed';
          statusCategory = 'REVOKED';
        } else if (settlementStatus === 'CANCELLED') {
          revokedCount++;
          statusLabel = 'Order Cancelled';
          statusCategory = 'REVOKED';
        } else if (settlementStatus === 'FAILED') {
          revokedCount++;
          statusLabel = 'Payment Failed';
          statusCategory = 'REVOKED';
        } else if (accessState === 'REVOKED') {
          revokedCount++;
          statusLabel = 'Access Revoked';
          statusCategory = 'REVOKED';
        } else if (accessState === 'SUSPENDED') {
          revokedCount++;
          statusLabel = 'Access Suspended';
          statusCategory = 'REVOKED';
        } else if (accessState === 'EXPIRED') {
          statusLabel = 'Enrollment Expired';
          statusCategory = 'EXPIRED';
        } else if (settlementStatus === 'SETTLED') {
          if (accessState === 'ACTIVE') {
            settledCount++;
            statusLabel = 'Enrolled (Active)';
            statusCategory = 'ACTIVE';
          } else if (accessState === 'PROVISIONED') {
            settledCount++;
            statusLabel = 'Access Provisioning Pending';
            statusCategory = 'PROVISIONING';
          } else {
            statusLabel = 'Access Pending Verification';
            statusCategory = 'UNKNOWN';
          }
        } else if (settlementStatus === 'PENDING' || settlementStatus === 'PROCESSING') {
          pendingCount++;
          statusLabel = settlementStatus === 'PROCESSING' ? 'Payment Processing' : 'Payment Settlement Pending';
          statusCategory = 'PENDING';
        } else if (settlementStatus === 'UNVERIFIED_HISTORICAL') {
          statusLabel = 'Historical Verification Pending';
          statusCategory = 'UNVERIFIED';
        } else {
          statusLabel = 'Unknown Status';
          statusCategory = 'UNKNOWN';
        }

        courses.push({
          enrollmentId: String(row.id),
          courseId: String(row.course_id),
          title,
          slug,
          examTag,
          image,
          shortDescription,
          enrolledAt: row.enrolled_at ? new Date(row.enrolled_at).toISOString() : new Date().toISOString(),
          settlementStatus,
          accessState,
          enrollmentSource,
          statusLabel,
          statusCategory,
          classroomAccessEligible: false,
          classroomStatusNotice: CLASSROOM_STATUS_NOTICE,
          courseDetailsUrl: course ? `/course/${course.slug}` : `/course-all`,
        });
      }
    }
  } catch (err) {
    console.error('[getStudentCoursesData Error]', err);
    // Gracefully returns empty list if commerce database connection is temporarily unavailable
  }

  return {
    courses,
    counts: {
      totalEnrollments: courses.length,
      settledCount,
      pendingCount,
      revokedCount,
    },
    limitations: {
      classroomEnforcement: 'DISABLED_IN_CURRENT_PHASE',
      courseProgressTracking: 'NOT_SUPPORTED_IN_CURRENT_SCHEMA',
    },
  };
}
