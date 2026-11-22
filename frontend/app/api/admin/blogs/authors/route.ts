import { NextRequest, NextResponse } from 'next/server';
import { getAuthors, saveAuthors } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { BlogAuthor } from '@/lib/content/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authors = getAuthors();
  return NextResponse.json({ success: true, data: authors, count: authors.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'MANAGE_AUTHORS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    if (!body.name?.trim() || !body.role?.trim()) {
      return NextResponse.json({ success: false, error: 'Author name and role are required.' }, { status: 400 });
    }

    const list = getAuthors();
    const newAuthor: BlogAuthor = {
      id: `auth-${Date.now().toString().slice(-6)}`,
      name: body.name.trim(),
      role: body.role.trim(),
      avatar: body.avatar?.trim() || '/site/assets/images/logo.png',
      bio: body.bio?.trim() || '',
      isVerified: Boolean(body.isVerified),
    };

    list.push(newAuthor);
    saveAuthors(list);
    return NextResponse.json({ success: true, data: newAuthor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
