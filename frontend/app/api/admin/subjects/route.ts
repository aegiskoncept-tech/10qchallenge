import { NextRequest, NextResponse } from 'next/server';
import { getAdminSubjects, createSubject } from '@/lib/db/subjects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || searchParams.get('q') || undefined;

    const subjects = getAdminSubjects(search);

    return NextResponse.json({
      success: true,
      data: subjects,
      count: subjects.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/subjects Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch subjects.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminUser = req.headers.get('x-admin-user') || body.adminUser || 'Administrator';

    const result = await createSubject(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.subject,
      message: 'Subject created successfully in Subject Master.',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/subjects Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create subject.' },
      { status: 500 }
    );
  }
}
