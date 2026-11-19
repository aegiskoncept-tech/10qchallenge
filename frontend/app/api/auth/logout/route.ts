import { NextRequest, NextResponse } from 'next/server';
import { extractAuthToken } from '@/lib/auth/serverAuth';
import { verifyJwt } from '@/lib/auth/jwt';
import { AuthDb } from '@/lib/auth/database';
import { clearAuthCookies } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = extractAuthToken(req);
    if (token) {
      const payload = await verifyJwt(token);
      if (payload && payload.sessionId) {
        AuthDb.revokeSession(payload.sessionId);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    clearAuthCookies(response);
    return response;
  } catch (error: any) {
    console.error('[POST /api/auth/logout Error]', error);
    const response = NextResponse.json({ success: true, message: 'Logged out.' });
    clearAuthCookies(response);
    return response;
  }
}
