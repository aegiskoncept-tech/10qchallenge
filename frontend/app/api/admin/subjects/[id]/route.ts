import { NextRequest, NextResponse } from 'next/server';
import { getSubjectById, updateSubject, deleteSubject } from '@/lib/db/subjects';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'SUBJECTS', 'GET_SUBJECT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric ID required.' }, { status: 400 });
    }

    const subject = getSubjectById(numId);

    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'SUBJECTS', 'UPDATE_SUBJECT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    const result = await updateSubject(numId, body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.subject,
      message: 'Subject updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/subjects/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update subject.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'SUBJECTS', 'DELETE_SUBJECT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const numId = Number(id);

    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric ID required.' }, { status: 400 });
    }

    const result = await deleteSubject(numId);

    if (!result.success) {
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
      message: 'Subject successfully removed from master catalogue.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/subjects/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete subject.' }, { status: 500 });
  }
}
