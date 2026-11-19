import { NextRequest, NextResponse } from 'next/server';
import { getChapterById, updateChapter, deleteChapter } from '@/lib/db/chapters';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'CHAPTERS', 'GET_CHAPTER');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const chapterId = Number(id);

    if (!chapterId || isNaN(chapterId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric chapter ID required.' }, { status: 400 });
    }

    const chapter = getChapterById(chapterId);

    if (!chapter) {
      return NextResponse.json({ success: false, error: 'Chapter not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: chapter });
  } catch (error: any) {
    console.error('[GET /api/admin/chapters/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'CHAPTERS', 'UPDATE_CHAPTER');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const chapterId = Number(id);

    if (!chapterId || isNaN(chapterId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric chapter ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    const result = await updateChapter(chapterId, body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.chapter,
      message: 'Chapter updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/chapters/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'CHAPTERS', 'DELETE_CHAPTER');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const chapterId = Number(id);

    if (!chapterId || isNaN(chapterId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric chapter ID required.' }, { status: 400 });
    }

    const result = await deleteChapter(chapterId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.chapter,
      message: 'Chapter deleted successfully.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/chapters/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}
