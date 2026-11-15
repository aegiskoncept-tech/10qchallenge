import { NextRequest, NextResponse } from 'next/server';
import { getExamBySlugOrId } from '@/lib/db/exams';
import { getPublicCourses } from '@/lib/db/courses';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Exam slug or ID is required.' },
        { status: 400 }
      );
    }

    const exam = getExamBySlugOrId(slug, false);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: 'Exam not found or is currently inactive.' },
        { status: 404 }
      );
    }

    // If accessed via an old historical slug, issue a permanent HTTP 301 redirect to canonical URL
    if (exam.isCanonicalSlug === false) {
      const canonicalUrl = new URL(`/api/exams/${exam.slug}`, req.url);
      return NextResponse.redirect(canonicalUrl, 301);
    }

    // Also get active published courses for this exam
    const courses = getPublicCourses({ exam: exam.examName });

    return NextResponse.json({
      success: true,
      data: {
        ...exam,
        courses,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/exams/[slug] Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch exam details.' },
      { status: 500 }
    );
  }
}
