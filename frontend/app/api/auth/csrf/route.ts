import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CSRF_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let token = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
  }

  const response = NextResponse.json({
    success: true,
    csrfToken: token,
  });

  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });

  return response;
}
