import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
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

    const { fullName, email, mobileNumber, password, targetExam } = body || {};

    // Validate fields
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Full name must be at least 2 characters.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return NextResponse.json({ success: false, error: strengthCheck.reason }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitKey = `register:${ip}`;

    // Rate limiting check: max 5 registrations per 15 minutes per IP
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many registration attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Check duplicate email
    const existing = AuthDb.findUserByEmail(normalizedEmail);
    if (existing) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists.' },
        { status: 400 }
      );
    }

    // Hash password securely with memory-hard scrypt
    const passwordHash = await hashPassword(password);

    // Create student user
    const newUser = AuthDb.createUser({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobileNumber: mobileNumber?.trim() || null,
      passwordHash,
      role: 'STUDENT',
      targetExam: targetExam || 'BITSAT',
      isActive: true,
    });

    clearRateLimit(rateLimitKey);

    // Create session
    const sessionResult = await createAuthSession(newUser, ip, userAgent);

    const response = NextResponse.json({
      success: true,
      message: 'Account successfully registered.',
      user: sessionResult.user,
      csrfToken: sessionResult.csrfToken,
    });

    setAuthCookies(response, sessionResult.token, sessionResult.csrfToken);
    return response;
  } catch (error: any) {
    console.error('[POST /api/auth/register Error]', error);
    return NextResponse.json(
      { success: false, error: 'Registration service encountered an error.' },
      { status: 500 }
    );
  }
}
