import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/commerce/coupon-service';
import { extractAuthToken, validateSessionAndUser } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, courseId = '1', orderAmount } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, discount: 0, message: 'Please enter a coupon code.' },
        { status: 400 }
      );
    }

    // Optional student context
    let studentId: number | undefined;
    const token = extractAuthToken(req);
    if (token) {
      const auth = await validateSessionAndUser(token);
      if (auth.valid && auth.user) {
        studentId = auth.user.id;
      }
    }

    const amount = Number(orderAmount) || 0;
    const result = await CouponService.validateCoupon({
      code,
      courseId: String(courseId),
      orderAmount: amount,
      studentId,
    });

    return NextResponse.json(
      {
        valid: result.valid,
        code: result.code,
        discount: result.discountAmount,
        discountAmount: result.discountAmount,
        netPayableAmount: result.netPayableAmount,
        message: result.message,
      },
      { status: result.valid ? 200 : 400 }
    );
  } catch (error: any) {
    console.error('[POST /api/coupons/validate Exception]', error);
    return NextResponse.json(
      { valid: false, discount: 0, message: 'Server error validating coupon.' },
      { status: 500 }
    );
  }
}
