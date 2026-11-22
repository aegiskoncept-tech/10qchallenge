import { NextRequest, NextResponse } from 'next/server';
import { getCategories, saveCategories } from '@/lib/db/blogs';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { BlogCategory } from '@/lib/content/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const categories = getCategories();
  return NextResponse.json({ success: true, data: categories, count: categories.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'BLOGS', 'MANAGE_CATEGORIES');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    const list = getCategories();
    const slug = (body.slug || body.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (list.some((c) => c.slug === slug || c.name.toLowerCase() === body.name.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Category with this name or slug already exists.' }, { status: 400 });
    }

    const newCat: BlogCategory = {
      id: `cat-${Date.now().toString().slice(-6)}`,
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || undefined,
      isArchived: false,
    };

    list.push(newCat);
    saveCategories(list);
    return NextResponse.json({ success: true, data: newCat }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
