import { NextRequest, NextResponse } from 'next/server';
import { getCourseBySlugOrId } from '@/lib/db/courses';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const target = body?.id || body?.slug || body?.mastercourseid;
    if (!target) {
      return NextResponse.json({ success: false, error: 'Target ID or slug is required.' }, { status: 400 });
    }

    const course = getCourseBySlugOrId(target, false);
    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('id') || searchParams.get('slug');
  if (!target) {
    return NextResponse.json({ success: false, error: 'Target ID or slug is required.' }, { status: 400 });
  }
  const course = getCourseBySlugOrId(target, false);
  if (!course) {
    return NextResponse.json({ success: false, error: 'Course not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: course });
}
