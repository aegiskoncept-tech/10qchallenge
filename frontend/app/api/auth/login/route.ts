import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { verifyPassword } from '@/lib/auth/password';
import { createAuthSession, setAuthCookies } from '@/lib/auth/session';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/auth/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { email, password } = body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitKey = `login:${ip}:${normalizedEmail}`;

    // Rate limiting check
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Lookup user in database
    const user = AuthDb.findUserByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify cryptographic password hash
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Clear rate limit on success
    clearRateLimit(rateLimitKey);

    // Create session and sign token
    const sessionResult = await createAuthSession(user, ip, userAgent);

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      user: sessionResult.user,
      csrfToken: sessionResult.csrfToken,
    });

    setAuthCookies(response, sessionResult.token, sessionResult.csrfToken);
    return response;
  } catch (error: any) {
    console.error('[POST /api/auth/login Error]', error);
    return NextResponse.json(
      { success: false, error: 'Authentication service encountered an error.' },
      { status: 500 }
    );
  }
}
