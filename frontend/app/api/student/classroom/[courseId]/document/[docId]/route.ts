import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { LearningProgressService } from '@/lib/learning/progress-service';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';
import { getDocumentById } from '@/lib/db/documents';
import { resolvePrivatePdfFile } from '@/lib/documents/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; docId: string }> }
) {
  // 1. Authenticate student session
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  // 2. Anti-IDOR: ID derived strictly from authenticated server session
  const authenticatedUserId = auth.user.id;

  // 3. Parse and validate courseId and docId
  const resolvedParams = await params;
  const courseId = parseInt(resolvedParams.courseId, 10);
  const docId = parseInt(resolvedParams.docId, 10);

  if (isNaN(courseId) || courseId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing course ID.' },
      { status: 400 }
    );
  }

  if (isNaN(docId) || docId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing document ID.' },
      { status: 400 }
    );
  }

  // 4. Validate course existence against canonical Course Master
  const courses = AcademicHierarchyValidator.getCourses();
  const course = courses.find((c) => Number(c.id) === courseId);
  if (!course) {
    return NextResponse.json(
      { success: false, error: `Course #${courseId} does not exist.` },
      { status: 404 }
    );
  }

  // 5. Rate limit: 60 requests per minute
  const rateLimit = checkRateLimit(`classroom_doc_${authenticatedUserId}_${courseId}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down.',
        retryAfter: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  // 6. Resolve document from Document Master
  const doc = getDocumentById(docId);
  const isAdmin = auth.user.role === 'ADMIN';
  if (!doc || (!isAdmin && doc.status && doc.status !== 'Published')) {
    return NextResponse.json(
      { success: false, error: `Document #${docId} not found or unavailable.` },
      { status: 404 }
    );
  }

  // 7. Server-side enrollment authorization check
  if (!isAdmin && !doc.isFreePreview) {
    const isEligible = await LearningProgressService.isStudentEligibleForCourse(
      authenticatedUserId,
      courseId
    );
    if (!isEligible) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You do not have an active settled enrollment for this course.',
        },
        { status: 403 }
      );
    }
  }

  // 8. Validate that document strictly belongs to the requested course's academic hierarchy
  const chapters = AcademicHierarchyValidator.getChapters();
  const matchingChapter = chapters.find(
    (ch) =>
      ch.chapterName.trim().toLowerCase() === doc.chapter.trim().toLowerCase() ||
      (doc as any).chapterId === ch.id
  );

  if (!matchingChapter || Number(matchingChapter.courseId) !== courseId) {
    return NextResponse.json(
      {
        success: false,
        error: `Hierarchy mismatch: Document does not belong to Course #${courseId}.`,
      },
      { status: 403 }
    );
  }

  // 9. Validate supported file format (PDF strictly required)
  if (doc.fileType !== 'PDF') {
    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported document format. Only PDF streaming is supported.',
      },
      { status: 400 }
    );
  }

  // 10. Check download permissions
  const { searchParams } = new URL(req.url);
  const isDownload = searchParams.get('download') === 'true' || searchParams.get('download') === '1';
  if (isDownload && doc.allowDownload === false && !isAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden: Direct file downloading is disabled for this study material.',
      },
      { status: 403 }
    );
  }

  // 11. Resolve physical PDF in private document storage outside public web root
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

    // Apply safe filename handling for Content-Disposition
    const safeTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const safeFilename = `${safeTitle}.pdf`;
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const contentDisposition = `${dispositionType}; filename="${safeFilename}"`;

    // 12. Support HTTP Range requests (RFC 7233)
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

    // Full stream (HTTP 200)
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
    console.error(`[GET /api/student/classroom/${courseId}/document/${docId} Error]`, err);
    return NextResponse.json(
      { success: false, error: 'Internal server error streaming document.' },
      { status: 500 }
    );
  }
}
