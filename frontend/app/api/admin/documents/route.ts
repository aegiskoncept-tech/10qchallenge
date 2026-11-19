import { NextRequest, NextResponse } from 'next/server';
import { getAdminDocuments, createDocument, validateDocumentHierarchy } from '@/lib/db/documents';
import { savePrivatePdfFile, deletePrivatePdfFile, MAX_PDF_UPLOAD_SIZE } from '@/lib/documents/storage';
import { requireAdmin } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, 'DOCUMENTS', 'LIST_DOCUMENTS');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const subject = searchParams.get('subject') || undefined;
    const rawCourseId = searchParams.get('courseId');
    const courseId = rawCourseId ? parseInt(rawCourseId, 10) : undefined;

    const list = getAdminDocuments(search, subject, courseId);
    return NextResponse.json({ success: true, data: list, count: list.length });
  } catch (err: any) {
    console.error('[GET /api/admin/documents Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, 'DOCUMENTS', 'CREATE_DOCUMENT');
  if (!auth.authenticated || !auth.user) return auth.errorResponse!;

  const adminUser = `${auth.user.fullName} (${auth.user.email})`;
  const contentType = req.headers.get('content-type') || '';

  try {
    // --------------------------------------------------------------------------
    // A. Handle Multipart Form-Data (Physical PDF File Upload)
    // --------------------------------------------------------------------------
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = (formData.get('title') as string || '').trim();
      const description = (formData.get('description') as string || '').trim();
      const category = (formData.get('category') as string || 'Revision Notes').trim();

      const rawCourseId = formData.get('courseId') as string;
      const rawSubjectId = formData.get('subjectId') as string;
      const rawChapterId = formData.get('chapterId') as string;
      const rawTopicId = formData.get('topicId') as string;
      const rawDisplayOrder = formData.get('displayOrder') as string;
      const rawPageCount = formData.get('pageCount') as string;
      const status = (formData.get('status') as string || 'Published').trim();

      if (!title) {
        return NextResponse.json({ success: false, error: 'Document title is required.' }, { status: 400 });
      }

      if (!file || typeof file === 'string') {
        return NextResponse.json({ success: false, error: 'A valid PDF file is required.' }, { status: 400 });
      }

      // Validate MIME type
      const mimeType = file.type || '';
      const isPdfMime = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdfMime) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${mimeType || 'unknown'}. Only PDF documents are allowed.` },
          { status: 400 }
        );
      }

      // Validate file size limit
      if (file.size > MAX_PDF_UPLOAD_SIZE) {
        return NextResponse.json(
          { success: false, error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB.` },
          { status: 400 }
        );
      }

      const courseId = rawCourseId ? parseInt(rawCourseId, 10) : NaN;
      const subjectId = rawSubjectId ? parseInt(rawSubjectId, 10) : NaN;
      const chapterId = rawChapterId ? parseInt(rawChapterId, 10) : NaN;
      const topicId = rawTopicId && rawTopicId !== 'none' ? parseInt(rawTopicId, 10) : undefined;
      const displayOrder = rawDisplayOrder ? parseInt(rawDisplayOrder, 10) : 1;
      const pageCount = rawPageCount ? parseInt(rawPageCount, 10) : 1;

      // Validate mandatory academic hierarchy
      if (isNaN(courseId) || courseId <= 0) {
        return NextResponse.json({ success: false, error: 'Please select a valid Course.' }, { status: 400 });
      }
      if (isNaN(subjectId) || subjectId <= 0) {
        return NextResponse.json({ success: false, error: 'Please select a valid Subject.' }, { status: 400 });
      }
      if (isNaN(chapterId) || chapterId <= 0) {
        return NextResponse.json({ success: false, error: 'Please select a valid Chapter.' }, { status: 400 });
      }

      // Server-side hierarchy relationship check
      const hierarchy = validateDocumentHierarchy({
        courseId,
        subjectId,
        chapterId,
        topicId,
      });

      if (!hierarchy.valid) {
        return NextResponse.json({ success: false, error: hierarchy.error }, { status: 400 });
      }

      // Convert file stream to Buffer and validate file signature (%PDF-)
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const savedFile = savePrivatePdfFile(buffer, file.name);
      if (!savedFile.success || !savedFile.storedFilename) {
        return NextResponse.json({ success: false, error: savedFile.error || 'Failed to save PDF file.' }, { status: 400 });
      }

      // Persist metadata
      const result = await createDocument(
        {
          title,
          description,
          category,
          courseId,
          courseTitle: hierarchy.courseTitle,
          subjectId,
          subject: hierarchy.subjectName,
          chapterId,
          chapter: hierarchy.chapterName,
          topicId,
          topicName: hierarchy.topicName,
          fileType: 'PDF',
          fileUrl: savedFile.fileUrl!,
          storedFilename: savedFile.storedFilename!,
          originalFilename: file.name,
          fileSizeBytes: savedFile.fileSizeBytes!,
          pageCount,
          status: status as any,
          displayOrder,
        },
        adminUser
      );

      if (!result.success) {
        // Safe orphan cleanup: remove stored physical file if metadata persistence fails
        if (savedFile.storedFilename) {
          deletePrivatePdfFile(savedFile.storedFilename);
        }
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.document }, { status: 201 });
    }

    // --------------------------------------------------------------------------
    // B. Handle Application/JSON Payload (Metadata-Only or Pre-Resolved URL)
    // --------------------------------------------------------------------------
    const body = await req.json();

    if (body.courseId && body.subjectId && body.chapterId) {
      const hierarchy = validateDocumentHierarchy({
        courseId: Number(body.courseId),
        subjectId: Number(body.subjectId),
        chapterId: Number(body.chapterId),
        topicId: body.topicId ? Number(body.topicId) : undefined,
      });

      if (!hierarchy.valid) {
        return NextResponse.json({ success: false, error: hierarchy.error }, { status: 400 });
      }
    }

    const result = await createDocument(body, adminUser);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.document }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/admin/documents Error]', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error processing document.' }, { status: 500 });
  }
}
