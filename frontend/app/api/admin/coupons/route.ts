import { NextRequest, NextResponse } from 'next/server';
import { getAdminCoupons, createCoupon } from '@/lib/db/coupons';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'COUPONS', 'LIST_COUPONS');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const coupons = getAdminCoupons(search);

    return NextResponse.json({
      success: true,
      data: coupons,
      count: coupons.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/coupons Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch coupons.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'COUPONS', 'CREATE_COUPON');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    const result = await createCoupon(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.coupon,
        message: 'Coupon created successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/coupons Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create coupon.' },
      { status: 500 }
    );
  }
}
