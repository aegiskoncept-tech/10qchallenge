import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/serverAuth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function readAttempts(): any[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'test-attempts.json'),
    path.join(cwd, 'frontend', 'data', 'test-attempts.json'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const attempts = JSON.parse(raw);
        if (Array.isArray(attempts)) return attempts;
      }
    } catch {}
  }
  return [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'TEST_ATTEMPTS', 'VIEW_ATTEMPT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const attempts = readAttempts();
  const found = attempts.find((a) => a.id === id);

  if (!found) {
    return NextResponse.json({ success: false, error: 'Attempt record not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: found,
  });
}
