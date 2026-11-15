import { NextRequest, NextResponse } from 'next/server';
import { getQuestionById, updateQuestion, deleteQuestion } from '@/lib/db/questions';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = Number(id);

    if (!questionId || isNaN(questionId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric question ID required.' }, { status: 400 });
    }

    const question = getQuestionById(questionId);

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error: any) {
    console.error('[GET /api/admin/questions/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = Number(id);

    if (!questionId || isNaN(questionId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric question ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = await updateQuestion(questionId, body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.question,
      message: 'Question updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/questions/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = Number(id);

    if (!questionId || isNaN(questionId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric question ID required.' }, { status: 400 });
    }

    const result = await deleteQuestion(questionId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.question,
      message: 'Question deleted successfully from Question Bank.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/questions/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}
