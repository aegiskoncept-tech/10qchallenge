import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { getCommerceDb } from '@/lib/commerce/db';
import { readCoursesFromDb } from '@/lib/db/courses';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getStudentTestAttempts(studentId: number): any[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'test-attempts.json'),
    path.join(cwd, 'frontend', 'data', 'test-attempts.json'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const attempts = JSON.parse(raw);
        if (Array.isArray(attempts)) {
          return attempts.filter((a) => Number(a.studentId) === studentId);
        }
      }
    } catch {}
  }
  return [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'STUDENTS', 'VIEW_STUDENT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const studentId = Number(id);
  const student = AuthDb.findUserById(studentId);

  if (!student) {
    return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
  }

  // Get enrolled courses
  let enrollments: any[] = [];
  try {
    const commerceDb = await getCommerceDb();
    const courses = readCoursesFromDb();
    const courseMap = new Map(courses.map((c) => [String(c.id), c]));

    const res = await commerceDb.query(
      `SELECT * FROM commerce.enrollments WHERE user_id = $1 ORDER BY enrolled_at DESC`,
      [studentId]
    );

    enrollments = res.rows.map((r: any) => {
      const course = courseMap.get(String(r.course_id));
      return {
        id: r.id,
        courseId: r.course_id,
        courseTitle: course?.title || `Course #${r.course_id}`,
        accessState: r.access_state,
        enrolledAt: r.enrolled_at,
        source: r.enrollment_source,
      };
    });
  } catch (err) {
    console.error('[AdminStudents] Error reading enrollments:', err);
  }

  // Get test attempts
  const attempts = getStudentTestAttempts(studentId);

  return NextResponse.json({
    success: true,
    data: {
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobileNumber: student.mobileNumber,
        role: student.role,
        targetExam: student.targetExam,
        isActive: student.isActive,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      enrollments,
      attempts,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'STUDENTS', 'UPDATE_STUDENT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const studentId = Number(id);

  try {
    const body = await req.json();
    const { isActive, fullName, mobileNumber, targetExam, revokeSessions } = body;

    const updateFields: any = {};
    if (typeof isActive === 'boolean') updateFields.isActive = isActive;
    if (fullName && typeof fullName === 'string') updateFields.fullName = fullName.trim();
    if (mobileNumber !== undefined) updateFields.mobileNumber = mobileNumber ? String(mobileNumber).trim() : null;
    if (targetExam !== undefined) updateFields.targetExam = targetExam ? String(targetExam).trim() : null;

    const updated = AuthDb.updateUser(studentId, updateFields);

    if (revokeSessions) {
      AuthDb.revokeAllUserSessions(studentId);
    }

    // Audit Logging
    try {
      AuthDb.logAdminActivity({
        userId: auth.user.id,
        action: 'UPDATE_STUDENT_ACCOUNT',
        module: 'STUDENTS',
        entityId: String(studentId),
        details: JSON.stringify(updateFields),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
