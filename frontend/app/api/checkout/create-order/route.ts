import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { OrderService } from '@/lib/commerce/order-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Student via session token or cookie
    const auth = await requireAuth(req);
    if (!auth.authenticated || !auth.user) {
      return (
        auth.errorResponse ||
        NextResponse.json(
          { success: false, error: 'AUTHENTICATION_REQUIRED', message: 'You must be signed in to purchase a course.' },
          { status: 401 }
        )
      );
    }
    const user = auth.user;

    // 2. Validate Request Body
    const body = await req.json();
    const courseId = body.courseId;
    const couponCode = body.couponCode;
    const billingFullName = (body.billingFullName || body.fullName || user.fullName || '').trim();
    const billingEmail = (body.billingEmail || body.email || user.email || '').trim().toLowerCase();
    const billingPhone = (body.billingPhone || body.phone || user.mobileNumber || '9999999999').trim();
    const billingStateCode = (body.billingStateCode || body.stateCode || 'DL').trim().toUpperCase();
    const billingCity = (body.billingCity || body.city || '').trim();
    const billingPostalCode = (body.billingPostalCode || body.postalCode || '').trim();

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_COURSE_ID', message: 'courseId is required.' },
        { status: 400 }
      );
    }

    if (!billingFullName || !billingEmail || !billingStateCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_BILLING_FIELDS',
          message: 'billingFullName, billingEmail, and billingStateCode are required.',
        },
        { status: 400 }
      );
    }

    if (billingStateCode.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE_CODE',
          message: 'billingStateCode must be a 2-letter state code (e.g. KA, MH, DL).',
        },
        { status: 400 }
      );
    }

    // 3. Create Order Server-Side
    const result = await OrderService.createOrder({
      userId: user.id,
      courseId: String(courseId),
      couponCode: typeof couponCode === 'string' && couponCode.trim() ? couponCode.trim() : undefined,
      billingFullName,
      billingEmail,
      billingPhone: billingPhone || undefined,
      billingStateCode,
      billingCity: billingCity || undefined,
      billingPostalCode: billingPostalCode || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        order: result.order,
        paymentGatewayPayload: result.payuParams,
        paymentAttempt: result.paymentAttempt,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/checkout/create-order error]', error);
    const isCouponError = error?.message?.startsWith('COUPON_INVALID:');
    return NextResponse.json(
      {
        success: false,
        error: isCouponError ? 'COUPON_INVALID' : 'INTERNAL_ERROR',
        message: isCouponError ? error.message.replace('COUPON_INVALID: ', '') : error.message || 'Failed to create order.',
      },
      { status: isCouponError ? 400 : 500 }
    );
  }
}
