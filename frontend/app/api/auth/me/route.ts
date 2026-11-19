import { NextRequest, NextResponse } from 'next/server';
import { extractAuthToken } from '@/lib/auth/serverAuth';
import { validateSessionAndUser, CSRF_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 401 }
      );
    }

    const result = await validateSessionAndUser(token);
    if (!result.valid || !result.user || !result.session) {
      return NextResponse.json(
        { success: false, authenticated: false, error: result.reason || 'Invalid session.', user: null },
        { status: 401 }
      );
    }

    const csrfToken = req.cookies.get(CSRF_COOKIE_NAME)?.value || result.session.csrfToken;

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: result.user.id,
        fullName: result.user.fullName,
        email: result.user.email,
        mobileNumber: result.user.mobileNumber,
        role: result.user.role,
        targetExam: result.user.targetExam,
      },
      csrfToken,
    });
  } catch (error: any) {
    console.error('[GET /api/auth/me Error]', error);
    return NextResponse.json(
      { success: false, authenticated: false, user: null },
      { status: 500 }
    );
  }
}
