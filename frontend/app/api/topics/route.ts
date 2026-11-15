import { NextRequest, NextResponse } from 'next/server';
import { getTopicsByChapter, readTopicsFromDb } from '@/lib/db/topics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chapterIdParam = searchParams.get('chapterId');

    if (chapterIdParam) {
      const chapterId = Number(chapterIdParam);
      const topics = getTopicsByChapter(chapterId);
      return NextResponse.json({
        success: true,
        data: topics,
        count: topics.length,
      });
    }

    const all = readTopicsFromDb();
    const active = all.filter((t) => t.isActive !== false);

    return NextResponse.json({
      success: true,
      data: active,
      count: active.length,
    });
  } catch (error: any) {
    console.error('[GET /api/topics Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch topics.' },
      { status: 500 }
    );
  }
}
