import { NextRequest, NextResponse } from 'next/server';
import { getAdminTopics, createTopic } from '@/lib/db/topics';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'TOPICS', 'LIST_TOPICS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const courseIdParam = searchParams.get('courseId');
    const subjectIdParam = searchParams.get('subjectId');
    const chapterIdParam = searchParams.get('chapterId');
    const search = searchParams.get('search') || undefined;
    const statusParam = searchParams.get('isActive');

    const courseId = courseIdParam ? Number(courseIdParam) : undefined;
    const subjectId = subjectIdParam ? Number(subjectIdParam) : undefined;
    const chapterId = chapterIdParam ? Number(chapterIdParam) : undefined;
    const isActive = statusParam !== null ? statusParam === 'true' : undefined;

    const topics = getAdminTopics({
      courseId,
      subjectId,
      chapterId,
      search,
      isActive,
    });

    return NextResponse.json({
      success: true,
      data: topics,
      count: topics.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/topics Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch topics.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'TOPICS', 'CREATE_TOPIC');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    const result = await createTopic(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.topic,
        message: 'Topic created successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/topics Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create topic.' },
      { status: 500 }
    );
  }
}
