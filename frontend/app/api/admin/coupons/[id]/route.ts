import { NextRequest, NextResponse } from 'next/server';
import { getCouponById, updateCoupon, deleteCoupon } from '@/lib/db/coupons';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'COUPONS', 'GET_COUPON');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const couponId = Number(id);

    if (!couponId || isNaN(couponId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric coupon ID required.' }, { status: 400 });
    }

    const coupon = getCouponById(couponId);
    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Coupon not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: coupon });
  } catch (error: any) {
    console.error('[GET /api/admin/coupons/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'COUPONS', 'UPDATE_COUPON');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const couponId = Number(id);

    if (!couponId || isNaN(couponId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric coupon ID required.' }, { status: 400 });
    }

    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;

    const result = await updateCoupon(couponId, body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.coupon,
      message: 'Coupon updated successfully.',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/coupons/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'COUPONS', 'DELETE_COUPON');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  try {
    const { id } = await params;
    const couponId = Number(id);

    if (!couponId || isNaN(couponId)) {
      return NextResponse.json({ success: false, error: 'Valid numeric coupon ID required.' }, { status: 400 });
    }

    const result = await deleteCoupon(couponId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.coupon,
      message: 'Coupon deleted successfully.',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/coupons/[id] Exception]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error.' }, { status: 500 });
  }
}
