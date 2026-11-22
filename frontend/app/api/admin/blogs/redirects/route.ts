import { NextRequest, NextResponse } from 'next/server';
import { getRedirects, addRedirect } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'VIEW_REDIRECTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const redirects = getRedirects();
  return NextResponse.json({ success: true, data: redirects, count: redirects.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'MANAGE_REDIRECTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    if (!body.fromSlug?.trim() || !body.toSlug?.trim()) {
      return NextResponse.json({ success: false, error: 'fromSlug and toSlug are required.' }, { status: 400 });
    }

    addRedirect(body.fromSlug, body.toSlug, body.statusCode || 301);
    return NextResponse.json({ success: true, message: 'Redirect created/updated.' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
