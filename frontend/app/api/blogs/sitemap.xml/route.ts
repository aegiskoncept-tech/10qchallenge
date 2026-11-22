import { NextResponse } from 'next/server';
import { generateBlogSitemapXml } from '@/lib/db/blogs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const xml = generateBlogSitemapXml();
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
