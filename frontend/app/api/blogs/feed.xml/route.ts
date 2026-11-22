import { NextResponse } from 'next/server';
import { generateBlogRssXml } from '@/lib/db/blogs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const xml = generateBlogRssXml();
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
