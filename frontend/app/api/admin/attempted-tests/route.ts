import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function readAttempts(): any[] {
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
        if (Array.isArray(attempts)) return attempts;
      }
    } catch {}
  }
  return [];
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'TEST_ATTEMPTS', 'LIST_ATTEMPTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { searchParams } = new URL(req.url);
  const examParam = searchParams.get('exam');
  const statusParam = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase().trim();

  const allAttempts = readAttempts();

  let filtered = allAttempts;

  if (examParam && examParam !== 'ALL') {
    filtered = filtered.filter((a) => a.examTag?.toLowerCase() === examParam.toLowerCase());
  }

  if (statusParam && statusParam !== 'ALL') {
    filtered = filtered.filter((a) => a.status === statusParam);
  }

  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.id.toLowerCase().includes(search) ||
        (a.studentName && a.studentName.toLowerCase().includes(search)) ||
        (a.studentEmail && a.studentEmail.toLowerCase().includes(search)) ||
        (a.paperTitle && a.paperTitle.toLowerCase().includes(search))
    );
  }

  // Analytics Metrics
  const total = allAttempts.length;
  const completed = allAttempts.filter((a) => a.status === 'COMPLETED');
  const inProgress = allAttempts.filter((a) => a.status === 'IN_PROGRESS');

  let avgScore = 0;
  let topScore = 0;
  if (completed.length > 0) {
    const scores = completed.map((c) => c.result?.finalScore ?? c.score ?? 0);
    avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / completed.length) * 10) / 10;
    topScore = Math.max(...scores);
  }

  return NextResponse.json({
    success: true,
    data: filtered.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName || `Student #${a.studentId}`,
      studentEmail: a.studentEmail || 'N/A',
      paperId: a.paperId,
      paperTitle: a.paperTitle || `Mock Test #${a.paperId}`,
      examTag: a.examTag || 'BITSAT',
      status: a.status,
      durationMinutes: a.durationMinutes || 180,
      totalQuestions: a.totalQuestions || 5,
      totalMarks: a.totalMarks || 15,
      score: a.result?.finalScore ?? a.score ?? null,
      accuracy: a.result?.accuracy ?? null,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt || null,
      submissionReason: a.submissionReason || null,
    })),
    metrics: {
      total,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      avgScore,
      topScore,
    },
  });
}
