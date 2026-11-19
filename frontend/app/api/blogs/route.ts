import { NextRequest, NextResponse } from 'next/server';
import { readBlogsFromDb } from '@/lib/db/blogs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const blogs = readBlogsFromDb().filter((b) => b.status === 'Published');
  return NextResponse.json({ success: true, data: blogs, count: blogs.length });
}
