import { NextRequest, NextResponse } from 'next/server';
import { AuthDb } from '@/lib/auth/database';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'AUDIT_LOGS', 'VIEW_LOGS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { searchParams } = new URL(req.url);
  const moduleParam = searchParams.get('module');
  const actionParam = searchParams.get('action');
  const search = searchParams.get('search')?.toLowerCase().trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

  const sqlite = AuthDb.getDb();

  const conditions: string[] = [];
  const params: any[] = [];

  if (moduleParam && moduleParam !== 'ALL') {
    conditions.push('l.module = ?');
    params.push(moduleParam.toUpperCase());
  }

  if (actionParam && actionParam !== 'ALL') {
    conditions.push('l.action = ?');
    params.push(actionParam.toUpperCase());
  }

  if (search) {
    const q = `%${search}%`;
    conditions.push('(LOWER(l.action) LIKE ? OR LOWER(l.details) LIKE ? OR LOWER(u.fullName) LIKE ? OR LOWER(u.email) LIKE ? OR l.entityId LIKE ?)');
    params.push(q, q, q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      l.id,
      l.userId,
      u.fullName as adminName,
      u.email as adminEmail,
      l.action,
      l.module,
      l.entityId,
      l.ipAddress,
      l.userAgent,
      l.details,
      l.timestamp
    FROM admin_activity_logs l
    LEFT JOIN users u ON u.id = l.userId
    ${whereClause}
    ORDER BY l.id DESC
    LIMIT ?
  `;

  const rows = sqlite.prepare(sql).all(...params, limit) as any[];

  // Metric counts
  const totalCount = (sqlite.prepare('SELECT COUNT(*) as c FROM admin_activity_logs').get() as any).c;
  const adminCount = (sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN'").get() as any).c;

  return NextResponse.json({
    success: true,
    data: rows,
    metrics: {
      totalLogs: Number(totalCount || 0),
      adminCount: Number(adminCount || 0),
      returnedCount: rows.length,
    },
  });
}
