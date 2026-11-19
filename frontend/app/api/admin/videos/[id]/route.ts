import { NextRequest, NextResponse } from 'next/server';
import { getVideoById, updateVideo, deleteVideo, validateVideoHierarchy, validateVideoProviderSecurity } from '@/lib/db/videos';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'VIDEOS', 'GET_VIDEO');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const videoId = parseInt(id, 10);
  if (isNaN(videoId) || videoId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid video ID.' }, { status: 400 });
  }

  const video = getVideoById(videoId);
  if (!video) {
    return NextResponse.json({ success: false, error: `Video #${videoId} not found.` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: video });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'VIDEOS', 'UPDATE_VIDEO');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const videoId = parseInt(id, 10);
  if (isNaN(videoId) || videoId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid video ID.' }, { status: 400 });
  }

  const existing = getVideoById(videoId);
  if (!existing) {
    return NextResponse.json({ success: false, error: `Video #${videoId} not found.` }, { status: 404 });
  }

  const adminUser = `${auth.user.fullName} (${auth.user.email})`;

  try {
    const body = await req.json();

    if (body.title !== undefined && !body.title.trim()) {
      return NextResponse.json({ success: false, error: 'Video title cannot be empty.' }, { status: 400 });
    }

    if (body.durationMinutes !== undefined) {
      const dur = Number(body.durationMinutes);
      if (isNaN(dur) || dur < 0 || dur > 1440) {
        return NextResponse.json({ success: false, error: 'Duration must be a valid number of minutes (0 - 1440).' }, { status: 400 });
      }
    }

    // Provider security validation if updating provider or identifiers
    if (body.provider !== undefined || body.providerVideoId !== undefined || body.vimeoVideoId !== undefined || body.videoUrl !== undefined) {
      const providerSecurity = validateVideoProviderSecurity({
        provider: body.provider || existing.provider,
        providerVideoId: body.providerVideoId !== undefined ? body.providerVideoId : existing.providerVideoId,
        vimeoVideoId: body.vimeoVideoId !== undefined ? body.vimeoVideoId : existing.vimeoVideoId,
        videoUrl: body.videoUrl !== undefined ? body.videoUrl : existing.videoUrl,
      });
      if (!providerSecurity.valid) {
        return NextResponse.json({ success: false, error: providerSecurity.error }, { status: 400 });
      }
    }

    // Hierarchy check if modifying academic assignment
    if (body.courseId !== undefined || body.subjectId !== undefined || body.chapterId !== undefined) {
      const courseId = body.courseId ? parseInt(body.courseId, 10) : existing.courseId;
      const subjectId = body.subjectId ? parseInt(body.subjectId, 10) : existing.subjectId;
      const chapterId = body.chapterId ? parseInt(body.chapterId, 10) : existing.chapterId;
      const topicId = body.topicId !== undefined
        ? (body.topicId && body.topicId !== 'none' ? parseInt(body.topicId, 10) : undefined)
        : existing.topicId;

      if (courseId && subjectId && chapterId) {
        const hierarchy = validateVideoHierarchy({ courseId, subjectId, chapterId, topicId });
        if (!hierarchy.valid) {
          return NextResponse.json({ success: false, error: hierarchy.error }, { status: 400 });
        }
      }
    }

    const result = await updateVideo(videoId, body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.video });
  } catch (err: any) {
    console.error('[PUT /api/admin/videos/[id] Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'VIDEOS', 'DELETE_VIDEO');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const videoId = parseInt(id, 10);
  if (isNaN(videoId) || videoId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid video ID.' }, { status: 400 });
  }

  const existing = getVideoById(videoId);
  if (!existing) {
    return NextResponse.json({ success: false, error: `Video #${videoId} not found.` }, { status: 404 });
  }

  const result = await deleteVideo(videoId, true);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: `Video #${videoId} deleted successfully.` });
}
