// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 11: COUPON MANAGEMENT SERVICE
// Engine: PostgreSQL 16 (commerce.coupons, commerce.coupon_redemptions)
// Supports: Percentage & Flat discounts, Concurrency-safe reservations,
//           Per-student & Total limits, Course eligibility validation.
// ==============================================================================

import { getCommerceDb } from './db';
import { PricingEngine } from './pricing';

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  code: string;
  discountType?: 'PERCENTAGE' | 'FLAT';
  discountValue?: number;
  discountAmount: number;
  netPayableAmount: number;
  originalAmount: number;
  message: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  totalRedemptionLimit: number | null;
  perStudentRedemptionLimit: number;
  applicableCourses: string[];
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  timesRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

export class CouponService {
  /**
   * Authoritative server-side coupon validation
   */
  public static async validateCoupon(params: {
    code: string;
    courseId: string;
    orderAmount: number;
    studentId?: number;
  }): Promise<CouponValidationResult> {
    const rawCode = (params.code || '').trim().toUpperCase();
    if (!rawCode) {
      return {
        valid: false,
        code: '',
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: 'Coupon code cannot be empty.',
      };
    }

    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM commerce.coupons WHERE UPPER(code) = $1 LIMIT 1;`,
      [rawCode]
    );

    if (res.rows.length === 0) {
      return {
        valid: false,
        code: rawCode,
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: `Coupon code "${rawCode}" does not exist.`,
      };
    }

    const row = res.rows[0];

    // 1. Check Active Status
    if (!row.is_active) {
      return {
        valid: false,
        code: rawCode,
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: `Coupon "${rawCode}" is currently inactive.`,
      };
    }

    const now = new Date();

    // 2. Check Starts At
    if (row.starts_at && new Date(row.starts_at) > now) {
      return {
        valid: false,
        code: rawCode,
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: `Coupon "${rawCode}" promotion has not started yet.`,
      };
    }

    // 3. Check Expires At
    if (row.expires_at && new Date(row.expires_at) < now) {
      return {
        valid: false,
        code: rawCode,
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: `Coupon "${rawCode}" has expired.`,
      };
    }

    // 4. Check Minimum Order Amount
    const minAmount = parseFloat(row.minimum_order_amount) || 0;
    if (params.orderAmount < minAmount) {
      return {
        valid: false,
        code: rawCode,
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: `Minimum order amount of ₹${minAmount.toLocaleString('en-IN')} required for coupon "${rawCode}".`,
      };
    }

    // 5. Check Course Applicability
    const applicableCourses: string[] = Array.isArray(row.applicable_courses)
      ? row.applicable_courses.map(String)
      : [];
    if (applicableCourses.length > 0 && !applicableCourses.includes(String(params.courseId))) {
      return {
        valid: false,
        code: rawCode,
        discountAmount: 0,
        netPayableAmount: params.orderAmount,
        originalAmount: params.orderAmount,
        message: `Coupon "${rawCode}" is not applicable to this course.`,
      };
    }

    // Run safe cleanup of abandoned reservations older than 30 minutes before evaluating redemption quotas
    await this.cleanupExpiredReservations(30);

    // 6. Check Total Redemption Limit
    if (row.total_redemption_limit !== null && row.total_redemption_limit > 0) {
      const redCountRes = await db.query(
        `SELECT COUNT(*) as count FROM commerce.coupon_redemptions 
         WHERE coupon_id = $1 AND redemption_status IN ('RESERVED', 'CONFIRMED');`,
        [row.id]
      );
      const activeRedemptions = parseInt(redCountRes.rows[0]?.count || '0', 10);
      if (activeRedemptions >= row.total_redemption_limit) {
        return {
          valid: false,
          code: rawCode,
          discountAmount: 0,
          netPayableAmount: params.orderAmount,
          originalAmount: params.orderAmount,
          message: `Coupon "${rawCode}" has reached its maximum total redemption limit.`,
        };
      }
    }

    // 7. Check Per-Student Redemption Limit
    if (params.studentId && row.per_student_redemption_limit) {
      const studentRedRes = await db.query(
        `SELECT COUNT(*) as count FROM commerce.coupon_redemptions 
         WHERE coupon_id = $1 AND student_id = $2 AND redemption_status IN ('RESERVED', 'CONFIRMED');`,
        [row.id, params.studentId]
      );
      const studentUsed = parseInt(studentRedRes.rows[0]?.count || '0', 10);
      if (studentUsed >= row.per_student_redemption_limit) {
        return {
          valid: false,
          code: rawCode,
          discountAmount: 0,
          netPayableAmount: params.orderAmount,
          originalAmount: params.orderAmount,
          message: `You have already redeemed coupon "${rawCode}" the maximum allowed times (${row.per_student_redemption_limit}).`,
        };
      }
    }

    // 8. Calculate Discount Value (Integer-Paise Decimal Safe)
    const orderPaise = PricingEngine.toPaise(params.orderAmount);
    const discountVal = parseFloat(row.discount_value);
    let calculatedDiscountPaise = 0;

    if (row.discount_type === 'FLAT') {
      const flatDiscountPaise = PricingEngine.toPaise(discountVal);
      calculatedDiscountPaise = Math.min(orderPaise, flatDiscountPaise);
    } else if (row.discount_type === 'PERCENTAGE') {
      const rawPctPaise = Math.round((orderPaise * discountVal) / 100);
      let capPaise = Infinity;
      if (row.maximum_discount_amount) {
        capPaise = PricingEngine.toPaise(parseFloat(row.maximum_discount_amount));
      }
      calculatedDiscountPaise = Math.min(rawPctPaise, capPaise, orderPaise);
    }

    const netPayablePaise = Math.max(0, orderPaise - calculatedDiscountPaise);

    const discountAmount = calculatedDiscountPaise / 100;
    const netPayableAmount = netPayablePaise / 100;

    return {
      valid: true,
      couponId: row.id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: discountVal,
      discountAmount,
      netPayableAmount,
      originalAmount: params.orderAmount,
      message: `Coupon "${row.code}" applied successfully! You saved ₹${discountAmount.toLocaleString('en-IN')}.`,
    };
  }

  /**
   * Concurrency-safe coupon reservation on order draft creation
   */
  public static async reserveCoupon(
    couponId: string,
    studentId: number,
    orderId: string,
    discountAmount: number
  ): Promise<{ success: boolean; error?: string }> {
    const db = await getCommerceDb();
    try {
      await db.query(
        `INSERT INTO commerce.coupon_redemptions (
          coupon_id, student_id, order_id, discount_amount, redemption_status, redeemed_at
        ) VALUES ($1, $2, $3, $4, 'RESERVED', NOW())
        ON CONFLICT (order_id) DO UPDATE
        SET coupon_id = $1, discount_amount = $4, redemption_status = 'RESERVED', redeemed_at = NOW();`,
        [couponId, studentId, orderId, discountAmount]
      );
      return { success: true };
    } catch (err: any) {
      console.error('[CouponService.reserveCoupon error]', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Confirms coupon redemption upon verified payment settlement
   */
  public static async confirmRedemption(orderId: string): Promise<void> {
    const db = await getCommerceDb();
    await db.transaction(async (tx) => {
      const res = await tx.query(
        `UPDATE commerce.coupon_redemptions
         SET redemption_status = 'CONFIRMED', confirmed_at = NOW()
         WHERE order_id = $1 AND redemption_status = 'RESERVED'
         RETURNING coupon_id;`,
        [orderId]
      );

      if (res.rows.length > 0) {
        const couponId = res.rows[0].coupon_id;
        await tx.query(
          `UPDATE commerce.coupons
           SET times_redeemed = times_redeemed + 1, updated_at = NOW()
           WHERE id = $1;`,
          [couponId]
        );
      }
    });
  }

  /**
   * Releases coupon reservation when payment fails or order expires
   */
  public static async releaseReservation(orderId: string): Promise<void> {
    const db = await getCommerceDb();
    await db.query(
      `UPDATE commerce.coupon_redemptions
       SET redemption_status = 'RELEASED', released_at = NOW()
       WHERE order_id = $1 AND redemption_status = 'RESERVED';`,
      [orderId]
    );
  }

  /**
   * Concurrency-safe, idempotent expiration of abandoned coupon reservations (default 30 minutes).
   * Enforces:
   * 1. Confirmed redemptions are NEVER released.
   * 2. Active payment attempts (<30m) protect the reservation from premature release.
   * 3. Only RESERVED redemptions older than expiryMinutes attached to non-completed orders are released.
   */
  public static async cleanupExpiredReservations(expiryMinutes: number = 30): Promise<{
    expiredCount: number;
    releasedOrderIds: string[];
  }> {
    const db = await getCommerceDb();
    try {
      const sql = `
        UPDATE commerce.coupon_redemptions cr
        SET redemption_status = 'RELEASED',
            released_at = NOW()
        FROM commerce.orders o
        WHERE cr.order_id = o.id
          AND cr.redemption_status = 'RESERVED'
          AND cr.redeemed_at < (NOW() - ($1 || ' minutes')::INTERVAL)
          AND o.status NOT IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
          AND NOT EXISTS (
            SELECT 1 FROM commerce.payment_attempts pa
            WHERE pa.order_id = o.id
              AND pa.status IN ('INITIATED', 'SUBMITTED_TO_GATEWAY')
              AND pa.initiated_at >= (NOW() - ($1 || ' minutes')::INTERVAL)
          )
        RETURNING cr.id, cr.order_id, cr.coupon_id;
      `;
      const res = await db.query(sql, [String(expiryMinutes)]);
      const releasedOrderIds = res.rows.map((r: any) => r.order_id);
      return {
        expiredCount: res.rows.length,
        releasedOrderIds,
      };
    } catch (err: any) {
      console.error('[CouponService.cleanupExpiredReservations Error]', err);
      return { expiredCount: 0, releasedOrderIds: [] };
    }
  }

  /**
   * Admin operations: List all coupons with stats
   */
  public static async listCoupons(filters?: {
    search?: string;
    isActive?: boolean;
    discountType?: string;
  }): Promise<CouponRecord[]> {
    const db = await getCommerceDb();
    let sql = `SELECT * FROM commerce.coupons WHERE 1=1`;
    const params: any[] = [];

    if (filters?.search) {
      params.push(`%${filters.search.toUpperCase()}%`);
      sql += ` AND (UPPER(code) LIKE $${params.length} OR UPPER(description) LIKE $${params.length})`;
    }

    if (filters?.isActive !== undefined) {
      params.push(filters.isActive);
      sql += ` AND is_active = $${params.length}`;
    }

    if (filters?.discountType && filters.discountType !== 'ALL') {
      params.push(filters.discountType.toUpperCase());
      sql += ` AND discount_type = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapCouponRow);
  }

  /**
   * Admin: Get Coupon by ID
   */
  public static async getCouponById(id: string): Promise<CouponRecord | null> {
    const db = await getCommerceDb();
    const res = await db.query(`SELECT * FROM commerce.coupons WHERE id = $1 LIMIT 1;`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapCouponRow(res.rows[0]);
  }

  /**
   * Admin: Create Coupon
   */
  public static async createCoupon(payload: {
    code: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    totalRedemptionLimit?: number;
    perStudentRedemptionLimit?: number;
    applicableCourses?: string[];
    startsAt?: string;
    expiresAt?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; coupon?: CouponRecord; error?: string }> {
    const code = (payload.code || '').trim().toUpperCase();
    if (!code || code.length < 3) {
      return { success: false, error: 'Coupon code must be at least 3 characters.' };
    }

    if (payload.discountValue <= 0) {
      return { success: false, error: 'Discount value must be greater than zero.' };
    }

    if (payload.discountType === 'PERCENTAGE' && payload.discountValue > 100) {
      return { success: false, error: 'Percentage discount cannot exceed 100%.' };
    }

    const db = await getCommerceDb();
    try {
      const res = await db.query(
        `INSERT INTO commerce.coupons (
          code, description, discount_type, discount_value, minimum_order_amount,
          maximum_discount_amount, total_redemption_limit, per_student_redemption_limit,
          applicable_courses, starts_at, expires_at, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *;`,
        [
          code,
          payload.description?.trim() || null,
          payload.discountType,
          payload.discountValue,
          payload.minOrderAmount || 0,
          payload.maxDiscount || null,
          payload.totalRedemptionLimit || null,
          payload.perStudentRedemptionLimit || 1,
          JSON.stringify(payload.applicableCourses || []),
          payload.startsAt || new Date().toISOString(),
          payload.expiresAt || null,
          payload.isActive ?? true,
        ]
      );
      return { success: true, coupon: this.mapCouponRow(res.rows[0]) };
    } catch (err: any) {
      if (err.message && err.message.includes('unique')) {
        return { success: false, error: `Coupon code "${code}" already exists.` };
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Admin: Update Coupon
   */
  public static async updateCoupon(
    id: string,
    payload: Partial<{
      description: string;
      discountType: 'PERCENTAGE' | 'FLAT';
      discountValue: number;
      minOrderAmount: number;
      maxDiscount: number;
      totalRedemptionLimit: number;
      perStudentRedemptionLimit: number;
      applicableCourses: string[];
      startsAt: string;
      expiresAt: string;
      isActive: boolean;
    }>
  ): Promise<{ success: boolean; coupon?: CouponRecord; error?: string }> {
    const db = await getCommerceDb();
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (payload.description !== undefined) {
        values.push(payload.description?.trim() || null);
        fields.push(`description = $${values.length}`);
      }
      if (payload.discountType !== undefined) {
        values.push(payload.discountType);
        fields.push(`discount_type = $${values.length}`);
      }
      if (payload.discountValue !== undefined) {
        values.push(payload.discountValue);
        fields.push(`discount_value = $${values.length}`);
      }
      if (payload.minOrderAmount !== undefined) {
        values.push(payload.minOrderAmount);
        fields.push(`minimum_order_amount = $${values.length}`);
      }
      if (payload.maxDiscount !== undefined) {
        values.push(payload.maxDiscount);
        fields.push(`maximum_discount_amount = $${values.length}`);
      }
      if (payload.totalRedemptionLimit !== undefined) {
        values.push(payload.totalRedemptionLimit);
        fields.push(`total_redemption_limit = $${values.length}`);
      }
      if (payload.perStudentRedemptionLimit !== undefined) {
        values.push(payload.perStudentRedemptionLimit);
        fields.push(`per_student_redemption_limit = $${values.length}`);
      }
      if (payload.applicableCourses !== undefined) {
        values.push(JSON.stringify(payload.applicableCourses));
        fields.push(`applicable_courses = $${values.length}`);
      }
      if (payload.startsAt !== undefined) {
        values.push(payload.startsAt);
        fields.push(`starts_at = $${values.length}`);
      }
      if (payload.expiresAt !== undefined) {
        values.push(payload.expiresAt);
        fields.push(`expires_at = $${values.length}`);
      }
      if (payload.isActive !== undefined) {
        values.push(payload.isActive);
        fields.push(`is_active = $${values.length}`);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const sql = `UPDATE commerce.coupons SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *;`;
      const res = await db.query(sql, values);
      if (res.rows.length === 0) {
        return { success: false, error: 'Coupon not found.' };
      }
      return { success: true, coupon: this.mapCouponRow(res.rows[0]) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Admin: Delete or Deactivate Coupon
   */
  public static async deleteCoupon(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getCommerceDb();
    try {
      // Check if redemptions exist
      const redRes = await db.query(
        `SELECT COUNT(*) as count FROM commerce.coupon_redemptions WHERE coupon_id = $1;`,
        [id]
      );
      const count = parseInt(redRes.rows[0]?.count || '0', 10);
      if (count > 0) {
        // Soft delete / deactivate to protect foreign key integrity
        await db.query(`UPDATE commerce.coupons SET is_active = FALSE, updated_at = NOW() WHERE id = $1;`, [id]);
        return { success: true };
      } else {
        await db.query(`DELETE FROM commerce.coupons WHERE id = $1;`, [id]);
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private static mapCouponRow(r: any): CouponRecord {
    return {
      id: r.id,
      code: r.code,
      description: r.description,
      discountType: r.discount_type,
      discountValue: parseFloat(r.discount_value),
      minOrderAmount: parseFloat(r.minimum_order_amount || '0'),
      maxDiscount: r.maximum_discount_amount ? parseFloat(r.maximum_discount_amount) : null,
      totalRedemptionLimit: r.total_redemption_limit ? parseInt(r.total_redemption_limit, 10) : null,
      perStudentRedemptionLimit: parseInt(r.per_student_redemption_limit || '1', 10),
      applicableCourses: Array.isArray(r.applicable_courses) ? r.applicable_courses : [],
      startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : '',
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      isActive: Boolean(r.is_active),
      timesRedeemed: parseInt(r.times_redeemed || '0', 10),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
    };
  }
}
