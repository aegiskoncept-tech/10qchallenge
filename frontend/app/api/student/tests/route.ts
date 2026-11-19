import { NextRequest, NextResponse } from 'next/server';
import { readTestSeriesFromDb } from '@/lib/db/test-series';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const exam = searchParams.get('exam') || undefined;
    const category = searchParams.get('category') || undefined;

    // Read authoritative test series records from DB
    const all = readTestSeriesFromDb();

    // Filter to only Published tests for students
    let list = all.filter((t) => t.status === 'Published');

    // Filter by exam tag if provided
    if (exam && exam !== 'ALL') {
      list = list.filter((t) => t.examTag.toLowerCase() === exam.toLowerCase());
    }

    // Filter by category if provided
    if (category === 'FULL_MOCK') {
      list = list.filter((t) => t.title.toLowerCase().includes('full') || t.title.toLowerCase().includes('mock'));
    } else if (category === 'CHAPTER_TEST') {
      list = list.filter((t) => !t.title.toLowerCase().includes('full') && !t.title.toLowerCase().includes('mock'));
    }

    // Filter by search term
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.examTag.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    // Map to student-safe presentation model (strip any internal admin fields)
    const sanitized = list.map((t) => ({
      id: t.id,
      title: t.title,
      examTag: t.examTag,
      targetYear: t.targetYear,
      description: t.description,
      durationMinutes: t.durationMinutes,
      totalQuestions: t.totalQuestions,
      totalMarks: t.totalMarks,
      price: t.price,
      status: t.status,
    }));

    return NextResponse.json({
      success: true,
      data: sanitized,
      count: sanitized.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch student tests.' },
      { status: 500 }
    );
  }
}
