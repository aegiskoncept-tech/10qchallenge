import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { AuthDb } from '@/lib/auth/database';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. One-time restriction: reject if an active admin already exists
    const adminCount = AuthDb.countAdmins();
    if (adminCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Administrator bootstrap has already been completed. Bootstrap is permanently closed.',
        },
        { status: 403 }
      );
    }

    // 2. Enforce private setup secret
    const configuredSecret = process.env.SETUP_ADMIN_SECRET;
    if (!configuredSecret || configuredSecret.length < 16) {
      return NextResponse.json(
        {
          success: false,
          error: 'Administrator bootstrap secret is not properly configured on this server.',
        },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const providedSecret = req.headers.get('x-setup-secret') || body?.setupSecret;
    if (!providedSecret || typeof providedSecret !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Setup secret is required.' },
        { status: 401 }
      );
    }

    // Constant-time comparison of setup secret
    const secretBuffer = Buffer.from(providedSecret);
    const configuredBuffer = Buffer.from(configuredSecret);
    if (
      secretBuffer.length !== configuredBuffer.length ||
      !crypto.timingSafeEqual(secretBuffer, configuredBuffer)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid setup secret.' },
        { status: 401 }
      );
    }

    // 3. Validate administrator credentials
    const { fullName, email, password, mobileNumber } = body || {};

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

    // Check if email already registered as student
    const existing = AuthDb.findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists.' },
        { status: 400 }
      );
    }

    // 4. Hash password securely
    const passwordHash = await hashPassword(password);

    // 5. Create initial administrator
    const adminUser = AuthDb.createUser({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobileNumber: mobileNumber?.trim() || null,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    AuthDb.logAdminActivity({
      userId: adminUser.id,
      action: 'BOOTSTRAP_INITIAL_ADMIN',
      module: 'AUTH',
      entityId: String(adminUser.id),
      ipAddress: ip,
      details: JSON.stringify({ email: adminUser.email, fullName: adminUser.fullName }),
    });

    return NextResponse.json({
      success: true,
      message: 'Initial administrator successfully initialized. Bootstrap is now permanently closed.',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/auth/bootstrap-admin Error]', error);
    return NextResponse.json(
      { success: false, error: 'Administrator bootstrap encountered an internal error.' },
      { status: 500 }
    );
  }
}
