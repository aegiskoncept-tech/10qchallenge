import { NextRequest, NextResponse } from 'next/server';
import { getAdminNotifications, createNotification } from '@/lib/db/notifications';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'NOTIFICATIONS', 'LIST_NOTIFICATIONS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;

  const list = getAdminNotifications(search);
  return NextResponse.json({ success: true, data: list, count: list.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'NOTIFICATIONS', 'CREATE_NOTIFICATION');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const body = await req.json();
    const adminUser = `${auth.user.fullName} (${auth.user.email})`;
    const result = await createNotification(body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.notification }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
