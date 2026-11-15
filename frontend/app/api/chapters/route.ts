import { NextRequest, NextResponse } from 'next/server';
import { getChaptersByCourseAndSubject, readChaptersFromDb } from '@/lib/db/chapters';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseIdParam = searchParams.get('courseId');
    const subjectIdParam = searchParams.get('subjectId');

    if (courseIdParam && subjectIdParam) {
      const courseId = Number(courseIdParam);
      const subjectId = Number(subjectIdParam);
      const chapters = getChaptersByCourseAndSubject(courseId, subjectId);
      return NextResponse.json({
        success: true,
        data: chapters,
        count: chapters.length,
      });
    }

    const all = readChaptersFromDb();
    const active = all.filter((c) => c.isActive !== false);

    return NextResponse.json({
      success: true,
      data: active,
      count: active.length,
    });
  } catch (error: any) {
    console.error('[GET /api/chapters Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch chapters.' },
      { status: 500 }
    );
  }
}
