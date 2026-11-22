import { NextRequest, NextResponse } from 'next/server';
import { createPreviewToken, revokePreviewToken, revokeAllPreviewTokensForBlog } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'PREVIEW_BLOG');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const blogId = Number(body.blogId);
    if (!blogId) {
      return NextResponse.json({ success: false, error: 'Valid blogId is required.' }, { status: 400 });
    }

    const token = await createPreviewToken(blogId, auth.user.email || 'Administrator');
    return NextResponse.json({
      success: true,
      token,
      previewUrl: `/blog/preview?token=${token}`,
      expiresIn: '2 hours',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'REVOKE_PREVIEW');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const blogId = searchParams.get('blogId');

    if (token) {
      const revoked = await revokePreviewToken(token);
      return NextResponse.json({ success: true, revoked });
    } else if (blogId) {
      const count = await revokeAllPreviewTokensForBlog(Number(blogId));
      return NextResponse.json({ success: true, revokedCount: count });
    }

    return NextResponse.json({ success: false, error: 'Token or blogId query parameter is required.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

