import { NextRequest, NextResponse } from 'next/server';
import { getTestSeriesById } from '@/lib/db/test-series';
import { requireAuth } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const resolvedParams = await params;
    const paperId = parseInt(resolvedParams.paperId, 10);

    if (isNaN(paperId) || paperId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid test paper ID.' },
        { status: 400 }
      );
    }

    const test = getTestSeriesById(paperId);
    if (!test || test.status !== 'Published') {
      return NextResponse.json(
        { success: false, error: 'Test paper not found or currently unavailable.' },
        { status: 404 }
      );
    }

    // Return student-safe test paper metadata without answer keys
    const sanitized = {
      id: test.id,
      title: test.title,
      examTag: test.examTag,
      targetYear: test.targetYear,
      description: test.description,
      durationMinutes: test.durationMinutes,
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalMarks,
      price: test.price,
      status: test.status,
      markingScheme: test.markingScheme
        ? {
            positiveMarks: test.markingScheme.positiveMarks,
            negativeMarks: test.markingScheme.negativeMarks,
          }
        : undefined,
      sections: test.sections
        ? test.sections.map((s) => ({
            name: s.name,
            questionCount: s.questionCount,
            totalMarks: s.totalMarks,
          }))
        : undefined,
      instructions: test.instructions,
      startDate: test.startDate,
      endDate: test.endDate,
      createdAt: test.createdAt,
    };

    return NextResponse.json({
      success: true,
      data: sanitized,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch test paper details.' },
      { status: 500 }
    );
  }
}
