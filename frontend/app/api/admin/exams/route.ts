import { NextRequest, NextResponse } from 'next/server';
import { getAdminExams, createExam } from '@/lib/db/exams';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || searchParams.get('q') || undefined;

    const exams = getAdminExams(search);

    return NextResponse.json({
      success: true,
      data: exams,
      count: exams.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/exams Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch admin exams.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Identify user from header or payload for audit trail
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = createExam(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.exam,
      message: 'Exam created successfully in Exam Master.',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/exams Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create exam.' },
      { status: 500 }
    );
  }
}
