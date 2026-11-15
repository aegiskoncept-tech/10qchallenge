import { NextRequest, NextResponse } from 'next/server';
import { getPublicSubjects } from '@/lib/db/subjects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const subjects = getPublicSubjects();

    return NextResponse.json({
      success: true,
      data: subjects,
      count: subjects.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/subjects Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch public subjects.' },
      { status: 500 }
    );
  }
}
