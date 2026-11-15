import { NextRequest, NextResponse } from 'next/server';
import { getPublicExams } from '@/lib/db/exams';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const exams = getPublicExams();

    return NextResponse.json({
      success: true,
      data: exams,
      count: exams.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
