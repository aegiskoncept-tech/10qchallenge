import { NextRequest, NextResponse } from 'next/server';
import { getPublicExams } from '@/lib/db/exams';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const exams = getPublicExams();

    return NextResponse.json({
      success: true,
      data: exams,
      count: exams.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/exams Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch public exams.' },
      { status: 500 }
    );
  }
}
