import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';
import { requireAdmin } from '@/lib/auth/serverAuth';
import { getDocumentById } from '@/lib/db/documents';
import { resolvePrivatePdfFile } from '@/lib/documents/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authenticate administrator session
  const auth = await requireAdmin(req, 'DOCUMENTS', 'PREVIEW_DOCUMENT');
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Parse and validate docId
  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId) || docId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid document ID.' }, { status: 400 });
  }

  // 3. Resolve document record
  const doc = getDocumentById(docId);
  if (!doc) {
    return NextResponse.json({ success: false, error: `Document #${docId} not found.` }, { status: 404 });
  }

  // 4. Resolve physical file in private document storage
  const resolvedFile = resolvePrivatePdfFile(doc.fileUrl);
  if (!resolvedFile.success || !resolvedFile.filePath) {
    return NextResponse.json(
      { success: false, error: resolvedFile.error || 'Document file not found on server.' },
      { status: resolvedFile.error?.includes('not found') ? 404 : 400 }
    );
  }

  try {
    const stat = fs.statSync(resolvedFile.filePath);
    const fileSize = stat.size;

    const safeTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const safeFilename = `${safeTitle}.pdf`;

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === 'true' || searchParams.get('download') === '1';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const contentDisposition = `${dispositionType}; filename="${safeFilename}"`;

    // 5. Support HTTP Range requests (RFC 7233)
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      }

      const rawStart = match[1];
      const rawEnd = match[2];

      let start = 0;
      let end = fileSize - 1;

      if (rawStart && rawEnd) {
        start = parseInt(rawStart, 10);
        end = parseInt(rawEnd, 10);
      } else if (rawStart) {
        start = parseInt(rawStart, 10);
      } else if (rawEnd) {
        start = Math.max(0, fileSize - parseInt(rawEnd, 10));
      }

      if (isNaN(start) || isNaN(end) || start >= fileSize || start > end || start < 0) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      }

      end = Math.min(end, fileSize - 1);
      const chunkSize = end - start + 1;

      const fd = fs.openSync(resolvedFile.filePath, 'r');
      const chunkBuffer = Buffer.alloc(chunkSize);
      fs.readSync(fd, chunkBuffer, 0, chunkSize, start);
      fs.closeSync(fd);

      return new NextResponse(chunkBuffer, {
        status: 206,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Full file stream (HTTP 200)
    const nodeStream = fs.createReadStream(resolvedFile.filePath);
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Content-Length': String(fileSize),
      },
    });
  } catch (err: any) {
    console.error(`[GET /api/admin/documents/${docId}/preview Error]`, err);
    return NextResponse.json(
      { success: false, error: 'Internal server error streaming document preview.' },
      { status: 500 }
    );
  }
}
