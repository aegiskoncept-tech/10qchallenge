import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { StudentNotesService } from '@/lib/notes/service';

export const dynamic = 'force-dynamic';

export async function GET(
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

  const result = await StudentNotesService.getNoteById(auth.user.id, noteId);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 404 }
    );
  }

  return NextResponse.json({ success: true, data: result.note });
}

export async function PATCH(
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

  const rl = checkRateLimit(`note_patch_${auth.user.id}`, 120, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many updates. Please wait a moment.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const result = await StudentNotesService.updateNote(auth.user.id, noteId, body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, data: result.note });
}

export async function DELETE(
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

  const result = await StudentNotesService.deleteNote(auth.user.id, noteId);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  return NextResponse.json({ success: true, message: 'Note deleted successfully.' });
}
