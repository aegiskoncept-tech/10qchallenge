import { NextRequest, NextResponse } from 'next/server';
import { readPlatformSettings, updatePlatformSettings } from '@/lib/db/settings';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { AuthDb } from '@/lib/auth/database';
import { getCommerceDb } from '@/lib/commerce/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'SETTINGS', 'VIEW_SETTINGS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const settings = readPlatformSettings();

  // Test DB health
  let pgStatus = 'DISCONNECTED';
  try {
    const pg = await getCommerceDb();
    const res = await pg.query('SELECT 1 as alive');
    if (res.rows.length > 0) pgStatus = 'CONNECTED';
  } catch {
    pgStatus = 'ERROR';
  }

  let sqliteStatus = 'CONNECTED';
  try {
    const db = AuthDb.getDb();
    db.prepare('SELECT 1').get();
  } catch {
    sqliteStatus = 'ERROR';
  }

  const mem = process.memoryUsage();

  return NextResponse.json({
    success: true,
    data: {
      settings,
      diagnostics: {
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssMb: Math.round(mem.rss / (1024 * 1024)),
        memoryHeapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        nodeEnv: process.env.NODE_ENV || 'production',
        port: process.env.PORT || '3000',
        databases: {
          sqliteAuth: sqliteStatus,
          postgresCommerce: pgStatus,
        },
      },
    },
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req, 'SETTINGS', 'UPDATE_SETTINGS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const updated = updatePlatformSettings(body, adminUser);

    try {
      AuthDb.logAdminActivity({
        userId: auth.user.id,
        action: 'UPDATE_PLATFORM_SETTINGS',
        module: 'SETTINGS',
        entityId: 'global',
        details: JSON.stringify(body),
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
