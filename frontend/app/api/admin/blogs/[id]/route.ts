import { NextRequest, NextResponse } from 'next/server';
import {
  getBlogById,
  updateBlog,
  deleteBlog,
  duplicateBlog,
} from '@/lib/db/blogs';
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
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const revisionSummary = body.revisionSummary || 'Updated via Admin CMS';
    delete body.revisionSummary;

    const result = await updateBlog(Number(id), body, adminUser, revisionSummary);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.blog });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'BLOGS', 'MANAGE_STATUS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  try {
    const body = await req.json();
    const action = body.action;
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    if (action === 'duplicate') {
      const res = await duplicateBlog(Number(id), adminUser);
      return NextResponse.json({ success: res.success, data: res.blog, blog: res.blog, error: res.error }, { status: res.success ? 201 : 400 });
    }

    if (action === 'publish') {
      const res = await updateBlog(
        Number(id),
        { status: 'Published', publishedAt: new Date().toISOString() },
        adminUser,
        'Article Published'
      );
      return NextResponse.json({ success: res.success, data: res.blog, blog: res.blog, error: res.error });
    }

    if (action === 'archive') {
      const res = await updateBlog(
        Number(id),
        { status: 'Archived' },
        adminUser,
        'Article Archived'
      );
      return NextResponse.json({ success: res.success, data: res.blog, blog: res.blog, error: res.error });
    }

    if (action === 'restore') {
      const res = await updateBlog(
        Number(id),
        { status: 'Draft' },
        adminUser,
        'Restored to Draft'
      );
      return NextResponse.json({ success: res.success, data: res.blog, blog: res.blog, error: res.error });
    }

    if (action === 'schedule') {
      if (!body.scheduledPublishAt) {
        return NextResponse.json({ success: false, error: 'Scheduled publish time is required.' }, { status: 400 });
      }
      const res = await updateBlog(
        Number(id),
        { status: 'Scheduled', scheduledPublishAt: body.scheduledPublishAt },
        adminUser,
        `Scheduled for ${new Date(body.scheduledPublishAt).toLocaleString()}`
      );
      return NextResponse.json({ success: res.success, data: res.blog, blog: res.blog, error: res.error });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
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
