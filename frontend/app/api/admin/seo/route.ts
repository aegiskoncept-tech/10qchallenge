import { NextRequest, NextResponse } from 'next/server';
import { readSeoConfigs, upsertSeoConfig } from '@/lib/db/seo';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { AuthDb } from '@/lib/auth/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'SEO', 'VIEW_SEO');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const configs = readSeoConfigs();
  return NextResponse.json({ success: true, data: configs });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req, 'SEO', 'UPDATE_SEO');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const result = await upsertSeoConfig(body, adminUser);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    try {
      AuthDb.logAdminActivity({
        userId: auth.user.id,
        action: 'UPDATE_SEO_CONFIG',
        module: 'SEO',
        entityId: body.route,
        details: JSON.stringify({ route: body.route, metaTitle: body.metaTitle }),
      });
    } catch {}

    return NextResponse.json({ success: true, data: result.config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
