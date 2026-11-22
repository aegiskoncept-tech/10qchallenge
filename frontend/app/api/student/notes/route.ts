import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { StudentNotesService } from '@/lib/notes/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!, 10) : undefined;
    const subjectId = searchParams.get('subjectId') ? parseInt(searchParams.get('subjectId')!, 10) : undefined;
    const chapterId = searchParams.get('chapterId') ? parseInt(searchParams.get('chapterId')!, 10) : undefined;
    const topicId = searchParams.get('topicId') ? parseInt(searchParams.get('topicId')!, 10) : undefined;
    const videoId = searchParams.get('videoId') ? parseInt(searchParams.get('videoId')!, 10) : undefined;
    const documentId = searchParams.get('documentId') ? parseInt(searchParams.get('documentId')!, 10) : undefined;
    const isPinned = searchParams.get('isPinned') !== null ? searchParams.get('isPinned') === 'true' : undefined;
    const search = searchParams.get('search') || undefined;

    const [notes, metrics] = await Promise.all([
      StudentNotesService.getStudentNotes(auth.user.id, {
        courseId,
        subjectId,
        chapterId,
        topicId,
        videoId,
        documentId,
        isPinned,
        search,
      }),
      StudentNotesService.getNotesMetrics(auth.user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: notes,
      metrics,
      count: notes.length,
    });
  } catch (err: any) {
    console.error('[GET /api/student/notes Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve notes.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const rl = checkRateLimit(`note_create_${auth.user.id}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }

  try {
    const result = await StudentNotesService.createNote(auth.user.id, body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.note }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/student/notes Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create note.' },
      { status: 500 }
    );
  }
}
