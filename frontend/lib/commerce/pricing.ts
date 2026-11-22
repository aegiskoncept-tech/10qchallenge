// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 11: SERVER-SIDE PRICING & TAX ENGINE
// Rule 1: Course prices are strictly tax-inclusive (GST included).
// Rule 2: Pure integer-paise arithmetic to eliminate floating-point drift.
// Rule 3: Authoritative calculation of Base Price, 18% GST Breakdown, and Coupons.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';

export interface CalculatedOrderPrice {
  courseId: string;
  courseTitle: string;
  originalAmountPaise: number;
  discountAmountPaise: number;
  netPayableAmountPaise: number;
  baseAmountPaise: number;
  taxAmountPaise: number;
  originalAmount: number; // in INR
  discountAmount: number; // in INR
  netPayableAmount: number; // in INR (what student pays)
  baseAmount: number; // in INR (tax-exclusive base)
  taxAmount: number; // in INR (18% GST portion)
  taxRatePercent: number; // 18.00
  isTaxInclusive: true;
}

export class PricingEngine {
  public static readonly DEFAULT_GST_RATE = 18.00;

  /**
   * Helper: Parse string or numeric price to exact integer paise
   */
  public static toPaise(amount: number | string): number {
    if (typeof amount === 'number') {
      return Math.round(amount * 100);
    }
    const trimmed = String(amount).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      throw new Error(`INVALID_PRICE_FORMAT: "${amount}" is not a valid INR monetary string.`);
    }
    const [rupees, paise = ''] = trimmed.split('.');
    return parseInt(rupees, 10) * 100 + parseInt(paise.padEnd(2, '0'), 10);
  }

  /**
   * Helper: Convert integer paise to formatted two-decimal INR string
   */
  public static toInrString(paise: number): string {
    return (paise / 100).toFixed(2);
  }

  /**
   * Enforces Course Master purchasing rules:
   * 1. Must be active (isActive !== false)
   * 2. Must not be expired (expiryDate >= today)
   */
  public static isPurchasable(course: any): { purchasable: boolean; reason?: string } {
    if (course.isActive === false) {
      return {
        purchasable: false,
        reason: 'This course is archived and no longer accepting new enrollments.',
      };
    }
    if (course.expiryDate) {
      const expiry = new Date(course.expiryDate);
      if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
        return {
          purchasable: false,
          reason: 'This course batch validity has expired.',
        };
      }
    }
    return { purchasable: true };
  }

  /**
   * Authoritative lookup of course in Course Master JSON
   */
  public static getAuthoritativeCourse(courseId: string): any {
    const cwd = process.cwd();
    const pathsToTry: string[] = [];
    if (process.env.DATA_STORE_DIR) {
      pathsToTry.push(path.join(process.env.DATA_STORE_DIR, 'courses.json'));
    }
    pathsToTry.push(
      path.join(cwd, 'data', 'courses.json'),
      path.join(cwd, 'frontend', 'data', 'courses.json'),
      path.join(cwd, '..', 'data', 'courses.json')
    );

    let foundCourse: any = null;
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          const courses = JSON.parse(raw);
          const c = courses.find((item: any) => String(item.id) === String(courseId) || item.slug === courseId);
          if (c) {
            foundCourse = c;
            break;
          }
        } catch {}
      }
    }

    if (!foundCourse) {
      throw new Error(`COURSE_NOT_FOUND: Course ID or slug "${courseId}" does not exist in Course Master.`);
    }

    return foundCourse;
  }

  /**
   * Calculate exact server-side pricing for a course purchase
   * Owner Requirement: Manual final selling price entered directly in Course Master.
   * - No automatic GST addition.
   * - No automatic GST deduction.
   * - No assumed 18% GST in course pricing.
   * - No hidden tax recalculation.
   * The entered selling price is the complete authoritative catalog price.
   */
  public static calculatePrice(
    courseId: string,
    couponDiscountPaise: number = 0
  ): CalculatedOrderPrice {
    const course = this.getAuthoritativeCourse(courseId);

    // Enforce purchasing rules (reject expired / inactive)
    const purchasability = this.isPurchasable(course);
    if (!purchasability.purchasable) {
      throw new Error(`COURSE_NOT_PURCHASABLE: ${purchasability.reason}`);
    }

    // Direct manual selling price entered in Course Master
    const rawFinalPrice = course.discountedPrice ?? course.price ?? course.originalPrice ?? 0;
    const rawOriginalPrice = course.originalPrice ?? rawFinalPrice;

    const originalPaise = this.toPaise(rawOriginalPrice);
    const standardDisplayPaise = this.toPaise(rawFinalPrice);

    let catalogDiscountPaise = originalPaise > standardDisplayPaise ? (originalPaise - standardDisplayPaise) : 0;
    let couponPaise = Math.max(0, couponDiscountPaise);
    let totalDiscountPaise = catalogDiscountPaise + couponPaise;

    // Student pays exactly the manual selling price minus coupon discount
    let finalNetPaise = Math.max(0, standardDisplayPaise - couponPaise);

    // Pure manual pricing: Base amount is the selling price; zero artificial tax deduction
    const basePaise = finalNetPaise;
    const taxPaise = 0;

    return {
      courseId: String(course.id),
      courseTitle: course.title,
      originalAmountPaise: originalPaise,
      discountAmountPaise: totalDiscountPaise,
      netPayableAmountPaise: finalNetPaise,
      baseAmountPaise: basePaise,
      taxAmountPaise: taxPaise,
      originalAmount: originalPaise / 100,
      discountAmount: totalDiscountPaise / 100,
      netPayableAmount: finalNetPaise / 100,
      baseAmount: basePaise / 100,
      taxAmount: 0.00,
      taxRatePercent: 0.00,
      isTaxInclusive: true,
    };
  }
}
