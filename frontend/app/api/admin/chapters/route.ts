import { NextRequest, NextResponse } from 'next/server';
import { getAdminChapters, createChapter } from '@/lib/db/chapters';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseIdParam = searchParams.get('courseId');
    const subjectIdParam = searchParams.get('subjectId');
    const search = searchParams.get('search') || undefined;
    const statusParam = searchParams.get('isActive');

    const courseId = courseIdParam ? Number(courseIdParam) : undefined;
    const subjectId = subjectIdParam ? Number(subjectIdParam) : undefined;
    const isActive = statusParam !== null ? statusParam === 'true' : undefined;

    const chapters = getAdminChapters({
      courseId,
      subjectId,
      search,
      isActive,
    });

    return NextResponse.json({
      success: true,
      data: chapters,
      count: chapters.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/chapters Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch chapters.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = await createChapter(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.chapter,
        message: 'Chapter created successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/chapters Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create chapter.' },
      { status: 500 }
    );
  }
}
