import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { StudentNotesService } from '@/lib/notes/service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  const noteId = parseInt(id, 10);
  if (isNaN(noteId) || noteId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid note ID.' }, { status: 400 });
  }

  const result = await StudentNotesService.togglePin(auth.user.id, noteId);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, isPinned: result.isPinned });
}
