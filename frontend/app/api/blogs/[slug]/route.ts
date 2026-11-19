import { NextRequest, NextResponse } from 'next/server';
import { getBlogBySlug, getBlogById } from '@/lib/db/blogs';

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

  if (!blog || blog.status !== 'Published') {
    return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: blog });
}
