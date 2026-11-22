import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/auth/rateLimiter';
import { saveDoubtAttachment } from '@/lib/doubts/attachments';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authenticated || !auth.user) {
    return auth.errorResponse!;
  }

  const rl = checkRateLimit(`doubt_upload_${auth.user.id}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Upload rate limit exceeded. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in form data ("file" field required).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = saveDoubtAttachment(buffer, file.name, file.type);
    if (!saved.success) {
      return NextResponse.json(
        { success: false, error: saved.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, attachment: saved.attachment },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /api/student/doubts/upload Error]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to upload attachment.' },
      { status: 500 }
    );
  }
}
