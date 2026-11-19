import { NextRequest, NextResponse } from 'next/server';
import { getBlogById, updateBlog, deleteBlog } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'BLOGS', 'VIEW_BLOG');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const blog = getBlogById(Number(id));

  if (!blog) {
    return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: blog });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'BLOGS', 'UPDATE_BLOG');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  try {
    const body = await req.json();
    const result = await updateBlog(Number(id), body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.blog });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'BLOGS', 'DELETE_BLOG');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const result = await deleteBlog(Number(id));

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Article deleted successfully.' });
}
