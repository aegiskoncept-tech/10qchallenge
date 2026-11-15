import { NextRequest, NextResponse } from 'next/server';
import { getExamBySlugOrId, updateExam, deleteExam } from '@/lib/db/exams';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric ID required.' }, { status: 400 });
    }

    const exam = getExamBySlugOrId(numId, true);

    if (!exam) {
      return NextResponse.json({ success: false, error: 'Exam not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: exam });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = updateExam(numId, body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.exam,
      message: 'Exam updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/exams/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update exam.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric ID required.' }, { status: 400 });
    }

    const result = deleteExam(numId);

    if (!result.success) {
      // 400 Bad Request with dependency error
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          associatedCoursesCount: result.associatedCoursesCount,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exam successfully removed from master catalogue.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/exams/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete exam.' }, { status: 500 });
  }
}
