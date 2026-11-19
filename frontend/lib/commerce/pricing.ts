// ==============================================================================
// 10Q CHALLENGE LMS — PHASE 4.2 SERVER-SIDE PRICING ENGINE
// Locked Rule: Course prices are strictly tax-inclusive (GST included).
// Calculation: Pure integer-paise arithmetic to eliminate floating-point drift.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';

export interface CalculatedOrderPrice {
  courseId: string;
  courseTitle: string;
  originalAmountPaise: number;
  discountAmountPaise: number;
  netPayableAmountPaise: number;
  originalAmount: number; // in INR
  discountAmount: number; // in INR
  netPayableAmount: number; // in INR
  isTaxInclusive: true;
}

export class PricingEngine {
  /**
   * Helper: Parse string or numeric price to exact integer paise
   */
  public static toPaise(amount: number | string): number {
    if (typeof amount === 'number') {
      return Math.round(amount * 100);
    }
    const trimmed = amount.trim();
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
    const rupees = (paise / 100).toFixed(2);
    return rupees;
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
    // Check custom test directory, then standard data paths
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
        } catch {
          // Continue to next path
        }
      }
    }

    if (!foundCourse) {
      throw new Error(`COURSE_NOT_FOUND: Course ID or slug "${courseId}" does not exist in Course Master.`);
    }

    return foundCourse;
  }

  /**
   * Calculate exact server-side pricing for a course purchase
   * Locked Rule: Tax-inclusive pricing (net payable = final display price)
   */
  public static calculatePrice(courseId: string, couponDiscountPercent: number = 0): CalculatedOrderPrice {
    const course = this.getAuthoritativeCourse(courseId);

    // Enforce purchasing rules (reject expired / inactive)
    const purchasability = this.isPurchasable(course);
    if (!purchasability.purchasable) {
      throw new Error(`COURSE_NOT_PURCHASABLE: ${purchasability.reason}`);
    }

    // Prefer discountedPrice, fallback to price or originalPrice
    const rawFinalPrice = course.discountedPrice ?? course.price ?? course.originalPrice ?? 0;
    const rawOriginalPrice = course.originalPrice ?? rawFinalPrice;

    const originalPaise = this.toPaise(rawOriginalPrice);
    let finalPaise = this.toPaise(rawFinalPrice);

    // Apply coupon if valid and within bounds [0, 100]
    let discountPaise = originalPaise > finalPaise ? (originalPaise - finalPaise) : 0;

    if (couponDiscountPercent > 0 && couponDiscountPercent <= 100) {
      const couponDeduction = Math.round((finalPaise * couponDiscountPercent) / 100);
      discountPaise += couponDeduction;
      finalPaise = Math.max(0, finalPaise - couponDeduction);
    }

    return {
      courseId: String(course.id),
      courseTitle: course.title,
      originalAmountPaise: originalPaise,
      discountAmountPaise: discountPaise,
      netPayableAmountPaise: finalPaise,
      originalAmount: originalPaise / 100,
      discountAmount: discountPaise / 100,
      netPayableAmount: finalPaise / 100,
      isTaxInclusive: true,
    };
  }
}
