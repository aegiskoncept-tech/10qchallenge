import { NextRequest, NextResponse } from 'next/server';
import { getAdminBlogs, createBlog, getBlogDashboardMetrics } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'LIST_BLOGS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;
  const sortBy = (searchParams.get('sortBy') as 'date' | 'views' | 'title') || 'date';

  const list = getAdminBlogs(search, category, status, sortBy);
  const metrics = getBlogDashboardMetrics();

  return NextResponse.json({
    success: true,
    data: list,
    count: list.length,
    metrics,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'CREATE_BLOG');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const result = await createBlog(body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.blog }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
