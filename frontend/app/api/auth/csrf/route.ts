import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CSRF_COOKIE_NAME, validateSessionAndUser } from '@/lib/auth/session';
import { extractAuthToken } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let token = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  // If user is authenticated, guarantee synchronization with database session CSRF token
  const authToken = extractAuthToken(req);
  if (authToken) {
    const sessionRes = await validateSessionAndUser(authToken);
    if (sessionRes.valid && sessionRes.session?.csrfToken) {
      token = sessionRes.session.csrfToken;
    }
  }

  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
  }

  const response = NextResponse.json({
    success: true,
    csrfToken: token,
  });

  const isSecure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://localhost') &&
      !process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://127.0.0.1'));

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });

  return response;
}
