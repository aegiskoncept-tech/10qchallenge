import { NextRequest, NextResponse } from 'next/server';
import { readBlogsFromDb } from '@/lib/db/blogs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase().trim();
  const tag = searchParams.get('tag')?.toLowerCase().trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '9', 10)));

  let blogs = readBlogsFromDb().filter((b) => b.status === 'Published');

  if (category && category !== 'ALL' && category !== 'All Exam') {
    blogs = blogs.filter((b) => b.category.toLowerCase() === category.toLowerCase());
  }

  if (tag) {
    blogs = blogs.filter((b) => b.tags.some((t) => t.toLowerCase() === tag));
  }

  if (search) {
    blogs = blogs.filter(
      (b) =>
        b.title.toLowerCase().includes(search) ||
        b.excerpt.toLowerCase().includes(search) ||
        b.category.toLowerCase().includes(search) ||
        b.tags.some((t) => t.toLowerCase().includes(search))
    );
  }

  // Sort by publishedAt / createdAt descending
  blogs.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());

  const total = blogs.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedData = blogs.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    success: true,
    data: paginatedData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}
