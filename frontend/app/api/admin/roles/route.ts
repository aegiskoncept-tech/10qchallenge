import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { requireAdmin } from '@/lib/auth/serverAuth';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'ROLES', 'VIEW_ROLES');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const db = AuthDb.getDb();
  const admins = db
    .prepare(
      `SELECT 
        u.id, 
        u.fullName, 
        u.email, 
        u.mobileNumber, 
        u.role, 
        u.isActive, 
        u.createdAt, 
        u.updatedAt,
        COUNT(s.sessionId) as activeSessionsCount,
        MAX(s.createdAt) as lastSessionAt
      FROM users u
      LEFT JOIN user_sessions s ON s.userId = u.id AND s.isRevoked = 0
      WHERE u.role = 'ADMIN'
      GROUP BY u.id
      ORDER BY u.id ASC`
    )
    .all() as any[];

  return NextResponse.json({
    success: true,
    data: admins.map((a) => ({
      id: Number(a.id),
      fullName: a.fullName,
      email: a.email,
      mobileNumber: a.mobileNumber,
      role: a.role,
      isActive: Boolean(a.isActive),
      activeSessionsCount: Number(a.activeSessionsCount || 0),
      lastSessionAt: a.lastSessionAt || a.createdAt,
      createdAt: a.createdAt,
      permissions: [
        'ALL_MODULES_READ',
        'ALL_MODULES_WRITE',
        'COMMERCE_MANAGEMENT',
        'TEST_SERIES_MANAGEMENT',
        'STUDENT_MANAGEMENT',
        'SECURITY_AUDIT',
      ],
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'ROLES', 'CREATE_ADMIN');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const { fullName, email, password, mobileNumber } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const existing = AuthDb.findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists.' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const newAdmin = AuthDb.createUser({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber || null,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });

    try {
      AuthDb.logAdminActivity({
        userId: auth.user.id,
        action: 'CREATE_ADMIN_ACCOUNT',
        module: 'ROLES',
        entityId: String(newAdmin.id),
        details: JSON.stringify({ email: newAdmin.email, fullName: newAdmin.fullName }),
      });
    } catch {}

    return NextResponse.json({ success: true, data: newAdmin }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req, 'ROLES', 'UPDATE_ADMIN');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const { id, isActive, fullName, mobileNumber, revokeSessions } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Admin user ID required.' }, { status: 400 });
    }

    // Safety guard: cannot deactivate oneself or the primary admin if only 1 active admin remains
    const activeAdminCount = AuthDb.countAdmins();
    if (isActive === false && activeAdminCount <= 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate the sole remaining active administrator.' },
        { status: 400 }
      );
    }

    const updateFields: any = {};
    if (typeof isActive === 'boolean') updateFields.isActive = isActive;
    if (fullName) updateFields.fullName = fullName.trim();
    if (mobileNumber !== undefined) updateFields.mobileNumber = mobileNumber ? String(mobileNumber).trim() : null;

    const updated = AuthDb.updateUser(Number(id), updateFields);

    if (revokeSessions) {
      AuthDb.revokeAllUserSessions(Number(id));
    }

    try {
      AuthDb.logAdminActivity({
        userId: auth.user.id,
        action: 'UPDATE_ADMIN_ACCOUNT',
        module: 'ROLES',
        entityId: String(id),
        details: JSON.stringify(updateFields),
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
