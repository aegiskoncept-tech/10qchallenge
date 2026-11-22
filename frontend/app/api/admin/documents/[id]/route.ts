import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocument, deleteDocument, validateDocumentHierarchy } from '@/lib/db/documents';
import { savePrivatePdfFile, deletePrivatePdfFile, MAX_PDF_UPLOAD_SIZE } from '@/lib/documents/storage';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOCUMENTS', 'GET_DOCUMENT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId) || docId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid document ID.' }, { status: 400 });
  }

  const doc = getDocumentById(docId);
  if (!doc) {
    return NextResponse.json({ success: false, error: `Document #${docId} not found.` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: doc });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOCUMENTS', 'UPDATE_DOCUMENT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId) || docId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid document ID.' }, { status: 400 });
  }

  const existing = getDocumentById(docId);
  if (!existing) {
    return NextResponse.json({ success: false, error: `Document #${docId} not found.` }, { status: 404 });
  }

  const adminUser = `${auth.user.fullName} (${auth.user.email})`;
  const contentType = req.headers.get('content-type') || '';

  try {
    // --------------------------------------------------------------------------
    // A. Handle Multipart Form-Data (Metadata Update with Optional File Replacement)
    // --------------------------------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') !== null ? (formData.get('title') as string).trim() : existing.title;
      const description = formData.get('description') !== null ? (formData.get('description') as string).trim() : existing.description;
      const category = formData.get('category') !== null ? (formData.get('category') as string).trim() : existing.category;

      const rawCourseId = formData.get('courseId') as string;
      const rawSubjectId = formData.get('subjectId') as string;
      const rawChapterId = formData.get('chapterId') as string;
      const rawTopicId = formData.get('topicId') as string;
      const rawDisplayOrder = formData.get('displayOrder') as string;
      const rawPageCount = formData.get('pageCount') as string;
      const status = formData.get('status') !== null ? (formData.get('status') as string).trim() : existing.status;
      const isFreePreview = formData.get('isFreePreview') !== null ? (formData.get('isFreePreview') === 'true' || formData.get('isFreePreview') === '1') : existing.isFreePreview;
      const allowDownload = formData.get('allowDownload') !== null ? (formData.get('allowDownload') === 'true' || formData.get('allowDownload') === '1') : existing.allowDownload;

      const courseId = rawCourseId ? parseInt(rawCourseId, 10) : existing.courseId;
      const subjectId = rawSubjectId ? parseInt(rawSubjectId, 10) : existing.subjectId;
      const chapterId = rawChapterId ? parseInt(rawChapterId, 10) : existing.chapterId;
      const topicId = rawTopicId !== null ? (rawTopicId === 'none' || !rawTopicId ? undefined : parseInt(rawTopicId, 10)) : existing.topicId;
      const displayOrder = rawDisplayOrder ? parseInt(rawDisplayOrder, 10) : existing.displayOrder;
      const pageCount = rawPageCount ? parseInt(rawPageCount, 10) : existing.pageCount;

      if (!title) {
        return NextResponse.json({ success: false, error: 'Document title is required.' }, { status: 400 });
      }

      // If hierarchy fields are present, validate relation
      if (courseId && subjectId && chapterId) {
        const hierarchy = validateDocumentHierarchy({
          courseId,
          subjectId,
          chapterId,
          topicId,
        });

        if (!hierarchy.valid) {
          return NextResponse.json({ success: false, error: hierarchy.error }, { status: 400 });
        }
      }

      let fileUrl = existing.fileUrl;
      let storedFilename = existing.storedFilename;
      let originalFilename = existing.originalFilename;
      let fileSizeBytes = existing.fileSizeBytes;

      // Handle PDF file replacement if a new file is uploaded
      if (file && typeof file !== 'string' && file.size > 0) {
        const mimeType = file.type || '';
        const isPdfMime = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdfMime) {
          return NextResponse.json(
            { success: false, error: `Invalid file type: ${mimeType || 'unknown'}. Only PDF documents are allowed.` },
            { status: 400 }
          );
        }

        if (file.size > MAX_PDF_UPLOAD_SIZE) {
          return NextResponse.json(
            { success: false, error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB.` },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const savedFile = savePrivatePdfFile(buffer, file.name);
        if (!savedFile.success || !savedFile.storedFilename) {
          return NextResponse.json({ success: false, error: savedFile.error || 'Failed to save replaced PDF file.' }, { status: 400 });
        }

        fileUrl = savedFile.fileUrl!;
        storedFilename = savedFile.storedFilename!;
        originalFilename = file.name;
        fileSizeBytes = savedFile.fileSizeBytes!;
      }

      const result = await updateDocument(
        docId,
        {
          title,
          description,
          category,
          courseId,
          subjectId,
          chapterId,
          topicId,
          fileUrl,
          storedFilename,
          originalFilename,
          fileSizeBytes,
          pageCount,
          isFreePreview,
          allowDownload,
          status: status as any,
          displayOrder,
        },
        adminUser
      );

      if (!result.success) {
        // Safe rollback: if a replacement physical file was written, remove it so the active document remains untouched
        if (storedFilename && storedFilename !== existing.storedFilename) {
          deletePrivatePdfFile(storedFilename);
        }
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.document });
    }

    // --------------------------------------------------------------------------
    // B. Handle Application/JSON Payload
    // --------------------------------------------------------------------------
    const body = await req.json();

    const courseId = body.courseId !== undefined ? Number(body.courseId) : existing.courseId;
    const subjectId = body.subjectId !== undefined ? Number(body.subjectId) : existing.subjectId;
    const chapterId = body.chapterId !== undefined ? Number(body.chapterId) : existing.chapterId;
    const topicId = body.topicId !== undefined ? (body.topicId ? Number(body.topicId) : undefined) : existing.topicId;

    if (courseId && subjectId && chapterId) {
      const hierarchy = validateDocumentHierarchy({
        courseId,
        subjectId,
        chapterId,
        topicId,
      });

      if (!hierarchy.valid) {
        return NextResponse.json({ success: false, error: hierarchy.error }, { status: 400 });
      }
    }

    const result = await updateDocument(docId, body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.document });
  } catch (err: any) {
    console.error(`[PUT /api/admin/documents/${docId} Error]`, err);
    return NextResponse.json({ success: false, error: err.message || 'Server error updating document.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req, 'DOCUMENTS', 'DELETE_DOCUMENT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId) || docId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid document ID.' }, { status: 400 });
  }

  const result = await deleteDocument(docId, true);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Document deleted successfully.' });
}
