import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { BlogMediaItem } from '@/lib/content/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'VIEW_MEDIA');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const mediaDir = path.join(process.cwd(), 'public', 'site', 'assets', 'img', 'blog');
  const items: BlogMediaItem[] = [];

  if (fs.existsSync(mediaDir)) {
    try {
      const files = fs.readdirSync(mediaDir);
      for (const file of files) {
        if (/\.(jpg|jpeg|png|webp|avif|svg)$/i.test(file)) {
          const filePath = path.join(mediaDir, file);
          const stat = fs.statSync(filePath);
          const sizeKb = (stat.size / 1024).toFixed(1);
          items.push({
            id: `media-${file}`,
            url: `/site/assets/img/blog/${file}`,
            filename: file,
            altText: file.replace(/[-_.]+/g, ' ').replace(/\s+(jpg|jpeg|png|webp|avif|svg)$/i, '').trim(),
            fileSize: `${sizeKb} KB`,
            uploadDate: stat.mtime.toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('[BlogMedia] Scan error:', err);
    }
  }

  // Sort descending by filename or uploadDate
  items.sort((a, b) => b.filename.localeCompare(a.filename, undefined, { numeric: true }));

  return NextResponse.json({
    success: true,
    data: items,
    count: items.length,
  });
}
