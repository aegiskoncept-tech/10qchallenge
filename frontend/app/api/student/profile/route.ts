import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { AuthDb } from '@/lib/auth/database';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = new Set(['fullName', 'mobileNumber', 'targetExam']);

// Authoritative Canonical Examination Options from data/exams.json
const CANONICAL_EXAM_VALUES = [
  'BITSAT',
  'Comedk',
  'JEE',
  'Manipal (MET)',
  'VITEEE',
] as const;

const CANONICAL_EXAM_NORMALIZATION: Record<string, string> = {
  'bitsat': 'BITSAT',
  'comedk': 'Comedk',
  'jee': 'JEE',
  'manipal (met)': 'Manipal (MET)',
  'viteee': 'VITEEE',
};

const MOBILE_REGEX = /^(\+?[0-9]{1,4}[\s-]?)?[0-9]{7,15}$/;

function sanitizeProfile(user: any) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    mobileNumber: user.mobileNumber || null,
    targetExam: user.targetExam || null,
    role: user.role,
    accountStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    // 2. Fetch fresh student profile from SQLite Auth DB
    const user = AuthDb.findUserById(auth.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Student record could not be found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sanitizeProfile(user),
    });
  } catch (err: any) {
    console.error('[GET /api/student/profile Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve student profile.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  // 1. Authenticate student session (also validates CSRF token for mutations)
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Parse request payload safely
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'Request body must be a valid JSON object.' },
      { status: 400 }
    );
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return NextResponse.json(
      { success: false, error: 'At least one editable profile field must be provided.' },
      { status: 400 }
    );
  }

  // 3. Strict allowlist verification — reject any protected or unexpected properties
  for (const key of keys) {
    if (!ALLOWED_FIELDS.has(key)) {
      return NextResponse.json(
        {
          success: false,
          error: `Modifying protected or unsupported field '${key}' is not permitted.`,
        },
        { status: 400 }
      );
    }
  }

  const updateData: {
    fullName?: string;
    mobileNumber?: string | null;
    targetExam?: string | null;
  } = {};

  // 4. Validate fullName
  if ('fullName' in body) {
    const rawName = body.fullName;
    if (typeof rawName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Full name must be a text string.' },
        { status: 400 }
      );
    }
    const trimmed = rawName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Full name must be between 2 and 100 characters.' },
        { status: 400 }
      );
    }
    updateData.fullName = trimmed;
  }

  // 5. Validate mobileNumber
  if ('mobileNumber' in body) {
    const rawMobile = body.mobileNumber;
    if (rawMobile === null || rawMobile === '') {
      updateData.mobileNumber = null;
    } else if (typeof rawMobile !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Mobile number must be a string or null.' },
        { status: 400 }
      );
    } else {
      const trimmed = rawMobile.trim();
      if (!MOBILE_REGEX.test(trimmed)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid mobile number format. Please provide a valid phone number.',
          },
          { status: 400 }
        );
      }
      updateData.mobileNumber = trimmed;
    }
  }

  // 6. Validate targetExam
  if ('targetExam' in body) {
    const rawExam = body.targetExam;
    if (rawExam === null || rawExam === '') {
      updateData.targetExam = null;
    } else if (typeof rawExam !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target examination must be a string or null.' },
        { status: 400 }
      );
    } else {
      const trimmed = rawExam.trim();
      const normalizedKey = trimmed.toLowerCase();
      const canonicalMatch = CANONICAL_EXAM_NORMALIZATION[normalizedKey];
      if (!canonicalMatch) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid target examination '${trimmed}'. Please select a canonical examination (BITSAT, Comedk, JEE, Manipal (MET), VITEEE).`,
          },
          { status: 400 }
        );
      }
      updateData.targetExam = canonicalMatch;
    }
  }

  try {
    // 7. Authoritative SQLite update using parameterized queries
    const updatedUser = AuthDb.updateUser(auth.user.id, updateData);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update student profile.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      data: sanitizeProfile(updatedUser),
    });
  } catch (err: any) {
    console.error('[PATCH /api/student/profile Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update student profile.' },
      { status: 500 }
    );
  }
}
