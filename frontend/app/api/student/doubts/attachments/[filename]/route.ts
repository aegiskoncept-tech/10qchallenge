import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth/serverAuth';
import {
  resolveDoubtAttachmentFile,
  verifyDoubtAttachmentOwnership,
} from '@/lib/doubts/attachments';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  // 1. Authenticate requester (unauthenticated -> 401)
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const { filename } = await params;

  // 2. Validate & normalize filename safely against path traversal
  const resolved = resolveDoubtAttachmentFile(filename);
  if (!resolved.success || !resolved.filePath) {
    const isTraversal =
      typeof filename === 'string' &&
      (filename.includes('..') ||
        filename.includes('/') ||
        filename.includes('\\') ||
        filename.indexOf('\0') !== -1);
    return NextResponse.json(
      { success: false, error: resolved.error || 'Attachment not found.' },
      { status: isTraversal ? 400 : 404 }
    );
  }

  // 3. Resolve exact database ownership and enforce authorization before streaming
  const authCheck = await verifyDoubtAttachmentOwnership(filename, {
    id: auth.user.id,
    role: auth.user.role,
  });

  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Access denied.' },
      { status: authCheck.status }
    );
  }

  // 4. Stream file securely
  try {
    const stat = fs.statSync(resolved.filePath);
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    const buffer = fs.readFileSync(resolved.filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="${path.basename(filename)}"`,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/student/doubts/attachments Error]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to stream attachment.' },
      { status: 500 }
    );
  }
}
