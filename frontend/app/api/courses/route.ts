import { NextRequest, NextResponse } from 'next/server';
import { getPublicCourses } from '@/lib/db/courses';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const exam = searchParams.get('exam') || undefined;
    const showInIndex = searchParams.get('showInIndex') === 'true' || searchParams.get('index') === 'true';
    const mentorship = searchParams.get('mentorship') === 'true';
    const testSeries = searchParams.get('testSeries') === 'true';
    const search = searchParams.get('search') || searchParams.get('q') || undefined;

    const courses = getPublicCourses({
      exam,
      showInIndex,
      mentorship,
      testSeries,
      search,
    });

    return NextResponse.json({
      success: true,
      data: courses,
      count: courses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/courses Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch courses.' },
      { status: 500 }
    );
  }
}
