import { NextRequest, NextResponse } from 'next/server';
import { getPublicCourses } from '@/lib/db/courses';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const exam = body?.exam || undefined;
    const courses = getPublicCourses({ exam });

    return NextResponse.json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
