import { NextRequest, NextResponse } from 'next/server';
import { extractAuthToken } from '@/lib/auth/serverAuth';
import { validateSessionAndUser, CSRF_COOKIE_NAME, SESSION_DURATION_SECONDS } from '@/lib/auth/session';

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

    const csrfToken = result.session.csrfToken;

    const response = NextResponse.json({
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

    // Synchronize client-accessible CSRF cookie with the database session token
    const isSecure =
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.NODE_ENV === 'production' &&
        !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://localhost') &&
        !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://127.0.0.1'));

    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error('[GET /api/auth/me Error]', error);
    return NextResponse.json(
      { success: false, authenticated: false, user: null },
      { status: 500 }
    );
  }
}
