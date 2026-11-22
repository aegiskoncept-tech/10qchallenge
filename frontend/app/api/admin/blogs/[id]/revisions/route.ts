import { NextRequest, NextResponse } from 'next/server';
import { getBlogById, restoreRevision } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'BLOGS', 'VIEW_REVISIONS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const blog = getBlogById(Number(id));

  if (!blog) {
    return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    revisions: blog.revisions || [],
    count: (blog.revisions || []).length,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'BLOGS', 'RESTORE_REVISION');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  try {
    const body = await req.json();
    const revisionId = body.revisionId;
    if (!revisionId) {
      return NextResponse.json({ success: false, error: 'revisionId is required.' }, { status: 400 });
    }

    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const result = await restoreRevision(Number(id), revisionId, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.blog, message: 'Revision restored successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
