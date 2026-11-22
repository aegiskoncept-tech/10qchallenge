import { NextRequest, NextResponse } from 'next/server';
import { getBlogBySlug, getBlogById, incrementBlogViews } from '@/lib/db/blogs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let blog = getBlogBySlug(slug);

  if (!blog && !isNaN(Number(slug))) {
    blog = getBlogById(Number(slug));
  }

  // Strict security: Only Published articles are publicly accessible
  if (!blog || blog.status !== 'Published') {
    return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
  }

  // Non-blocking increment of view counter
  try {
    incrementBlogViews(blog.id);
  } catch (_) {}

  return NextResponse.json({ success: true, data: blog });
}
