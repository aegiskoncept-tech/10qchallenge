import { NextRequest, NextResponse } from 'next/server';
import { getAdminVideos, createVideo, validateVideoHierarchy, validateVideoProviderSecurity, extractProviderVideoId } from '@/lib/db/videos';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'VIDEOS', 'LIST_VIDEOS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const subject = searchParams.get('subject') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const rawCourseId = searchParams.get('courseId');
    const courseId = rawCourseId ? parseInt(rawCourseId, 10) : undefined;

    const list = getAdminVideos(search, subject, courseId, provider);
    return NextResponse.json({ success: true, data: list, count: list.length });
  } catch (err: any) {
    console.error('[GET /api/admin/videos Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'VIDEOS', 'CREATE_VIDEO');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const adminUser = `${auth.user.fullName} (${auth.user.email})`;

  try {
    const body = await req.json();

    const title = (body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Video title is required.' }, { status: 400 });
    }

    const provider = (body.provider || 'VIMEO').toUpperCase();
    let providerVideoId = (body.providerVideoId || body.vimeoVideoId || '').trim();
    if (!providerVideoId) {
      return NextResponse.json({ success: false, error: 'Video Provider ID or Vimeo ID is required.' }, { status: 400 });
    }

    // Auto-extract canonical ID if URL was provided
    providerVideoId = extractProviderVideoId(provider, providerVideoId);
    body.providerVideoId = providerVideoId;
    if (provider === 'VIMEO') {
      body.vimeoVideoId = providerVideoId;
    }

    const providerSecurity = validateVideoProviderSecurity({
      provider: body.provider,
      providerVideoId,
      vimeoVideoId: body.vimeoVideoId,
      videoUrl: body.videoUrl,
    });
    if (!providerSecurity.valid) {
      return NextResponse.json({ success: false, error: providerSecurity.error }, { status: 400 });
    }

    // Validate duration if provided
    if (body.durationMinutes !== undefined) {
      const dur = Number(body.durationMinutes);
      if (isNaN(dur) || dur < 0 || dur > 1440) {
        return NextResponse.json({ success: false, error: 'Duration must be a valid number of minutes (0 - 1440).' }, { status: 400 });
      }
    }

    // Validate academic hierarchy if provided
    if (body.courseId || body.subjectId || body.chapterId) {
      const courseId = parseInt(body.courseId, 10);
      const subjectId = parseInt(body.subjectId, 10);
      const chapterId = parseInt(body.chapterId, 10);
      const topicId = body.topicId && body.topicId !== 'none' ? parseInt(body.topicId, 10) : undefined;

      if (isNaN(courseId) || courseId <= 0) {
        return NextResponse.json({ success: false, error: 'Please select a valid Course.' }, { status: 400 });
      }
      if (isNaN(subjectId) || subjectId <= 0) {
        return NextResponse.json({ success: false, error: 'Please select a valid Subject.' }, { status: 400 });
      }
      if (isNaN(chapterId) || chapterId <= 0) {
        return NextResponse.json({ success: false, error: 'Please select a valid Chapter.' }, { status: 400 });
      }

      const hierarchy = validateVideoHierarchy({ courseId, subjectId, chapterId, topicId });
      if (!hierarchy.valid) {
        return NextResponse.json({ success: false, error: hierarchy.error }, { status: 400 });
      }
    }

    const result = await createVideo(body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.video }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/admin/videos Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
