import { NextRequest, NextResponse } from 'next/server';
import { verifyPreviewToken } from '@/lib/db/blogs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Preview token is required.' }, { status: 400 });
  }

  const blog = await verifyPreviewToken(token);
  if (!blog) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired preview link. Please generate a new preview in Admin CMS.' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    data: blog,
    previewMode: true,
    expiresNotice: 'Active private preview token (valid for 2 hours)',
  });
}
