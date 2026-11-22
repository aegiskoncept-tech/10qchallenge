import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { DoubtService } from '@/lib/doubts/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const courseId = searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!, 10) : undefined;
    const search = searchParams.get('search') || undefined;

    const [doubts, metrics] = await Promise.all([
      DoubtService.getStudentDoubts(auth.user.id, { status, courseId, search }),
      DoubtService.getStudentMetrics(auth.user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: doubts,
      metrics,
      count: doubts.length,
    });
  } catch (err: any) {
    console.error('[GET /api/student/doubts Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve doubts.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // Rate limit: 30 doubt submissions per minute
  const rl = checkRateLimit(`doubt_create_${auth.user.id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }

  // Anti-IDOR: Prevent student identity spoofing
  if ('studentId' in body && body.studentId !== undefined) {
    if (Number(body.studentId) !== auth.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Supplied studentId does not match authenticated session identity.',
        },
        { status: 400 }
      );
    }
  }

  try {
    const result = await DoubtService.createDoubt(
      auth.user.id,
      { fullName: auth.user.fullName, email: auth.user.email },
      body
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.doubt }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/student/doubts Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create doubt.' },
      { status: 500 }
    );
  }
}
