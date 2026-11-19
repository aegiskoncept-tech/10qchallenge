import { NextRequest, NextResponse } from 'next/server';
import { getAdminSubjects, createSubject } from '@/lib/db/subjects';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'SUBJECTS', 'LIST_SUBJECTS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

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
  const auth = await requireAdmin(req, 'SUBJECTS', 'CREATE_SUBJECT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

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
