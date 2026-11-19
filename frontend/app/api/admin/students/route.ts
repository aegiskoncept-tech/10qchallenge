import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { getCommerceDb } from '@/lib/commerce/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getStudentAttemptsCounts(): Map<number, number> {
  const counts = new Map<number, number>();
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
          attempts.forEach((a) => {
            const sid = Number(a.studentId);
            if (sid) {
              counts.set(sid, (counts.get(sid) || 0) + 1);
            }
          });
          break;
        }
      }
    } catch {}
  }
  return counts;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'STUDENTS', 'LIST_STUDENTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') || 'STUDENT';
  const statusParam = searchParams.get('status');

  const { users, total } = AuthDb.listUsers({
    role,
    search,
    limit: 150,
  });

  // Query enrolled course counts from commerce.enrollments
  const enrollmentCounts = new Map<number, number>();
  try {
    const commerceDb = await getCommerceDb();
    const res = await commerceDb.query(`
      SELECT user_id, COUNT(*) as count 
      FROM commerce.enrollments 
      WHERE access_state = 'ACTIVE' 
      GROUP BY user_id
    `);
    res.rows.forEach((r: any) => {
      enrollmentCounts.set(Number(r.user_id), Number(r.count));
    });
  } catch (err) {
    console.error('[AdminStudents] Failed to query commerce.enrollments:', err);
  }

  // Query test attempts count
  const attemptsCounts = getStudentAttemptsCounts();

  // Query latest session for each user
  const sqlite = AuthDb.getDb();
  const sessionStmt = sqlite.prepare(`
    SELECT userId, MAX(createdAt) as lastLogin 
    FROM user_sessions 
    GROUP BY userId
  `);
  const sessionRows = (sessionStmt.all() as any[]) || [];
  const lastLoginMap = new Map<number, string>();
  sessionRows.forEach((r) => lastLoginMap.set(Number(r.userId), r.lastLogin));

  let enriched = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    mobileNumber: u.mobileNumber,
    role: u.role,
    targetExam: u.targetExam || 'General',
    isActive: u.isActive,
    enrolledCoursesCount: enrollmentCounts.get(u.id) || 0,
    testsAttemptedCount: attemptsCounts.get(u.id) || 0,
    lastLogin: lastLoginMap.get(u.id) || u.createdAt,
    createdAt: u.createdAt,
  }));

  if (statusParam === 'ACTIVE') {
    enriched = enriched.filter((u) => u.isActive);
  } else if (statusParam === 'INACTIVE') {
    enriched = enriched.filter((u) => !u.isActive);
  }

  return NextResponse.json({
    success: true,
    data: enriched,
    total: enriched.length,
  });
}
