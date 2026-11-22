import { NextRequest, NextResponse } from 'next/server';
import { getAdminQuestions, createQuestion, QuestionType, DifficultyLevel } from '@/lib/db/questions';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'QUESTIONS', 'LIST_QUESTIONS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type') as QuestionType | null;
    const courseIdParam = searchParams.get('courseId');
    const subjectIdParam = searchParams.get('subjectId');
    const chapterIdParam = searchParams.get('chapterId');
    const topicIdParam = searchParams.get('topicId');
    const difficultyParam = searchParams.get('difficulty') as DifficultyLevel | null;
    const search = searchParams.get('search') || undefined;
    const statusParam = searchParams.get('isActive');

    const courseId = courseIdParam && courseIdParam !== 'ALL' ? Number(courseIdParam) : undefined;
    const subjectId = subjectIdParam && subjectIdParam !== 'ALL' ? Number(subjectIdParam) : undefined;
    const chapterId = chapterIdParam && chapterIdParam !== 'ALL' ? Number(chapterIdParam) : undefined;
    const topicId = topicIdParam && topicIdParam !== 'ALL' ? Number(topicIdParam) : undefined;
    const isActive = statusParam !== null ? statusParam === 'true' : undefined;

    const questions = getAdminQuestions({
      questionType: typeParam || undefined,
      courseId,
      subjectId,
      chapterId,
      topicId,
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
  const auth = await requireAdmin(req, 'QUESTIONS', 'CREATE_QUESTION');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

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
