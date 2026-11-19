import { NextRequest, NextResponse } from 'next/server';
import { deleteNotification } from '@/lib/db/notifications';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req, 'NOTIFICATIONS', 'DELETE_NOTIFICATION');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const result = await deleteNotification(Number(id));
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, message: 'Notification deleted.' });
}
