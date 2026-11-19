import { NextRequest, NextResponse } from 'next/server';
import { validateCouponCode } from '@/lib/db/coupons';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, orderAmount } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, discount: 0, message: 'Please enter a coupon code.' },
        { status: 400 }
      );
    }

    const amount = Number(orderAmount) || 0;
    const result = validateCouponCode(code, amount);

    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch (error: any) {
    console.error('[POST /api/coupons/validate Exception]', error);
    return NextResponse.json(
      { valid: false, discount: 0, message: 'Server error validating coupon.' },
      { status: 500 }
    );
  }
}
