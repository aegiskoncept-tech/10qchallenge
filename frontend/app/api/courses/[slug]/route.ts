import { NextRequest, NextResponse } from 'next/server';
import { getCourseBySlugOrId } from '@/lib/db/courses';
import { getCourseWithDynamicCurriculum } from '@/lib/db/curriculum';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required.' }, { status: 400 });
    }

    const course = getCourseWithDynamicCurriculum(slug, false) || getCourseBySlugOrId(slug, false);

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found or is currently not published.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: course,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/courses/[slug] Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch course details.' },
      { status: 500 }
    );
  }
}
