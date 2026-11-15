import { NextRequest, NextResponse } from 'next/server';
import { getAdminQuestions, createQuestion, QuestionType, DifficultyLevel } from '@/lib/db/questions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type') as QuestionType | null;
    const subjectIdParam = searchParams.get('subjectId');
    const chapterIdParam = searchParams.get('chapterId');
    const difficultyParam = searchParams.get('difficulty') as DifficultyLevel | null;
    const search = searchParams.get('search') || undefined;
    const statusParam = searchParams.get('isActive');

    const subjectId = subjectIdParam ? Number(subjectIdParam) : undefined;
    const chapterId = chapterIdParam ? Number(chapterIdParam) : undefined;
    const isActive = statusParam !== null ? statusParam === 'true' : undefined;

    const questions = getAdminQuestions({
      questionType: typeParam || undefined,
      subjectId,
      chapterId,
      difficulty: difficultyParam || undefined,
      search,
      isActive,
    });

    return NextResponse.json({
      success: true,
      data: questions,
      count: questions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/questions Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch questions.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = await createQuestion(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.question,
        message: 'Question created successfully in Master Question Bank.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/questions Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create question.' },
      { status: 500 }
    );
  }
}
