import fs from 'fs';
import path from 'path';

export interface CouponRecord {
  id: number;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export const CANONICAL_DEFAULT_COUPONS: CouponRecord[] = [
  {
    id: 1,
    code: 'BITSAT500',
    discountType: 'FLAT',
    discountValue: 500,
    minOrderAmount: 2000,
    description: 'Flat ₹500 discount for BITSAT Champions batch enrollments.',
    usageLimit: 500,
    usedCount: 42,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 2,
    code: 'EARLYBIRD',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minOrderAmount: 1000,
    maxDiscount: 1000,
    description: '20% off for early aspirant enrollments.',
    usageLimit: 200,
    usedCount: 78,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
  {
    id: 3,
    code: 'RANKER10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderAmount: 500,
    description: '10% discount on all mock test series and course packs.',
    usedCount: 115,
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System',
  },
];

function getCouponDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'coupons.json'), path.join(persistentDir, 'coupons.json')] : []),
    path.join(cwd, 'data', 'coupons.json'),
    path.join(cwd, 'frontend', 'data', 'coupons.json'),
  ];

  const uniqueDirs = new Set<string>();
  const validPaths: string[] = [];

  for (const p of candidates) {
    const dir = path.dirname(p);
    if (!uniqueDirs.has(dir) && fs.existsSync(dir)) {
      uniqueDirs.add(dir);
      validPaths.push(p);
    }
  }

  if (validPaths.length === 0) {
    const fallback = persistentDir ? path.join(persistentDir, 'coupons.json') : path.join(cwd, 'data', 'coupons.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }

  return validPaths;
}

class AsyncMutex {
  private queue: Promise<any> = Promise.resolve();
  async run<T>(task: () => Promise<T> | T): Promise<T> {
    const res = this.queue.then(async () => task());
    this.queue = res.catch(() => {});
    return res;
  }
}

export const couponMutex = new AsyncMutex();

export function readCouponsFromDb(): CouponRecord[] {
  const paths = getCouponDataPaths();
  let candidateWithData: { path: string; data: CouponRecord[] } | null = null;
  let emptyPaths: string[] = [];

  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            candidateWithData = { path: filePath, data: parsed };
            break;
          } else if (Array.isArray(parsed)) {
            emptyPaths.push(filePath);
          }
        }
      } else {
        emptyPaths.push(filePath);
      }
    } catch (err) {
      console.error(`[DB Error] Reading coupons from ${filePath}:`, err);
    }
  }

  if (candidateWithData) {
    for (const emptyPath of emptyPaths) {
      try {
        const dir = path.dirname(emptyPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(emptyPath, JSON.stringify(candidateWithData.data, null, 2), 'utf-8');
      } catch {}
    }
    return candidateWithData.data;
  }

  writeCouponsToDb(CANONICAL_DEFAULT_COUPONS);
  return CANONICAL_DEFAULT_COUPONS;
}

export function writeCouponsToDb(coupons: CouponRecord[]): void {
  const json = JSON.stringify(coupons, null, 2);
  const paths = getCouponDataPaths();

  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tmpPath, json, 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      console.error(`[DB Error] Writing coupons to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (inner) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, inner);
      }
    }
  }
}

export function getAdminCoupons(search?: string): CouponRecord[] {
  const all = readCouponsFromDb();
  if (!search || !search.trim()) return all;
  const q = search.toLowerCase().trim();
  return all.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
  );
}

export function getCouponById(id: number): CouponRecord | null {
  const all = readCouponsFromDb();
  return all.find((c) => Number(c.id) === Number(id)) || null;
}

export function validateCouponCode(
  code: string,
  orderAmount: number
): { valid: boolean; discount: number; coupon?: CouponRecord; message?: string } {
  const all = readCouponsFromDb();
  const cleanCode = String(code || '').toUpperCase().trim();

  const coupon = all.find((c) => c.code.toUpperCase().trim() === cleanCode);
  if (!coupon) {
    return { valid: false, discount: 0, message: 'Invalid or unrecognized coupon code.' };
  }

  if (!coupon.isActive) {
    return { valid: false, discount: 0, message: 'This coupon is currently inactive.' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
    return { valid: false, discount: 0, message: 'This coupon has expired.' };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discount: 0, message: 'Coupon usage limit has been reached.' };
  }

  if (orderAmount < coupon.minOrderAmount) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.`,
    };
  }

  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = Math.round((orderAmount * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, orderAmount);

  return {
    valid: true,
    discount,
    coupon,
    message: `Coupon '${coupon.code}' applied successfully (₹${discount} discount).`,
  };
}

export async function createCoupon(
  data: {
    code: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    expiryDate?: string;
    usageLimit?: number;
    description?: string;
    isActive?: boolean;
  },
  user = 'Administrator'
): Promise<{ success: boolean; coupon?: CouponRecord; error?: string }> {
  return couponMutex.run(async () => {
    const code = String(data.code || '').toUpperCase().trim();
    if (!code) {
      return { success: false, error: 'Coupon code is required.' };
    }
    if (data.discountType !== 'PERCENTAGE' && data.discountType !== 'FLAT') {
      return { success: false, error: 'Discount type must be PERCENTAGE or FLAT.' };
    }
    const discountVal = Number(data.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      return { success: false, error: 'A positive discount value is required.' };
    }
    if (data.discountType === 'PERCENTAGE' && discountVal > 100) {
      return { success: false, error: 'Percentage discount cannot exceed 100%.' };
    }

    const all = readCouponsFromDb();
    if (all.some((c) => c.code.toUpperCase() === code)) {
      return { success: false, error: `Coupon code '${code}' already exists.` };
    }

    const newId = all.length > 0 ? Math.max(...all.map((c) => Number(c.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();

    const newCoupon: CouponRecord = {
      id: newId,
      code,
      discountType: data.discountType,
      discountValue: discountVal,
      minOrderAmount: Number(data.minOrderAmount) || 0,
      maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : undefined,
      expiryDate: data.expiryDate || undefined,
      usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
      usedCount: 0,
      description: data.description?.trim() || '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdAt: now,
      updatedAt: now,
      createdBy: user,
      updatedBy: user,
    };

    all.push(newCoupon);
    writeCouponsToDb(all);

    return { success: true, coupon: newCoupon };
  });
}

export async function updateCoupon(
  id: number,
  data: Partial<CouponRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; coupon?: CouponRecord; error?: string }> {
  return couponMutex.run(async () => {
    const couponId = Number(id);
    const all = readCouponsFromDb();
    const index = all.findIndex((c) => Number(c.id) === couponId);
    if (index === -1) {
      return { success: false, error: `Coupon with ID ${id} not found.` };
    }

    const existing = all[index];
    const targetCode = data.code !== undefined ? String(data.code).toUpperCase().trim() : existing.code;
    if (!targetCode) {
      return { success: false, error: 'Coupon code cannot be empty.' };
    }

    if (all.some((c) => Number(c.id) !== couponId && c.code.toUpperCase() === targetCode)) {
      return { success: false, error: `Coupon code '${targetCode}' is already taken.` };
    }

    const discountVal = data.discountValue !== undefined ? Number(data.discountValue) : existing.discountValue;
    const discountType = data.discountType !== undefined ? data.discountType : existing.discountType;

    if (discountType === 'PERCENTAGE' && discountVal > 100) {
      return { success: false, error: 'Percentage discount cannot exceed 100%.' };
    }

    const updated: CouponRecord = {
      ...existing,
      code: targetCode,
      discountType,
      discountValue: discountVal,
      minOrderAmount: data.minOrderAmount !== undefined ? Number(data.minOrderAmount) || 0 : existing.minOrderAmount,
      maxDiscount: data.maxDiscount !== undefined ? (data.maxDiscount ? Number(data.maxDiscount) : undefined) : existing.maxDiscount,
      expiryDate: data.expiryDate !== undefined ? (data.expiryDate || undefined) : existing.expiryDate,
      usageLimit: data.usageLimit !== undefined ? (data.usageLimit ? Number(data.usageLimit) : undefined) : existing.usageLimit,
      description: data.description !== undefined ? String(data.description).trim() : existing.description,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
      updatedAt: new Date().toISOString(),
      updatedBy: user,
    };

    all[index] = updated;
    writeCouponsToDb(all);

    return { success: true, coupon: updated };
  });
}

export async function deleteCoupon(
  id: number
): Promise<{ success: boolean; coupon?: CouponRecord; error?: string }> {
  return couponMutex.run(async () => {
    const couponId = Number(id);
    const all = readCouponsFromDb();
    const index = all.findIndex((c) => Number(c.id) === couponId);
    if (index === -1) {
      return { success: false, error: `Coupon with ID ${id} not found.` };
    }

    const deleted = all.splice(index, 1)[0];
    writeCouponsToDb(all);

    return { success: true, coupon: deleted };
  });
}
