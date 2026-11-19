import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { OrderService } from '@/lib/commerce/order-service';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Student via SQLite Session
    const sessionCookie = req.cookies.get('10q_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'AUTHENTICATION_REQUIRED', message: 'You must be signed in to purchase a course.' },
        { status: 401 }
      );
    }

    const session = AuthDb.findSession(sessionCookie);
    if (!session || session.isRevoked || new Date(session.expiresAt) <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION', message: 'Session expired or invalid. Please sign in again.' },
        { status: 401 }
      );
    }

    const user = AuthDb.findUserById(session.userId);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'USER_INACTIVE', message: 'User account is inactive or not found.' },
        { status: 403 }
      );
    }

    // 2. Validate Request Body
    const body = await req.json();
    const { courseId, billingFullName, billingEmail, billingPhone, billingStateCode, billingCity, billingPostalCode } = body;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_COURSE_ID', message: 'courseId is required.' },
        { status: 400 }
      );
    }

    if (!billingFullName || !billingEmail || !billingStateCode) {
      return NextResponse.json(
        { success: false, error: 'MISSING_BILLING_FIELDS', message: 'billingFullName, billingEmail, and billingStateCode are required.' },
        { status: 400 }
      );
    }

    if (billingStateCode.trim().length !== 2) {
      return NextResponse.json(
        { success: false, error: 'INVALID_STATE_CODE', message: 'billingStateCode must be a 2-letter state code (e.g. KA, MH, DL).' },
        { status: 400 }
      );
    }

    // 3. Create Order Server-Side
    const result = await OrderService.createOrder({
      userId: user.id,
      courseId: String(courseId),
      billingFullName: billingFullName.trim(),
      billingEmail: billingEmail.trim().toLowerCase(),
      billingPhone: billingPhone?.trim() || user.mobileNumber || undefined,
      billingStateCode: billingStateCode.trim().toUpperCase(),
      billingCity: billingCity?.trim() || undefined,
      billingPostalCode: billingPostalCode?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[API /api/checkout/create-order error]', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: error.message || 'Failed to create order.' },
      { status: 500 }
    );
  }
}
