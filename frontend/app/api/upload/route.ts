import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Maximum upload sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
]);

function getUploadDirectories(): string[] {
  const dirs = [
    path.join(process.cwd(), 'public', 'uploads', 'courses'),
    path.join(process.cwd(), 'frontend', 'public', 'uploads', 'courses'),
    path.join(process.cwd(), '..', 'public', 'uploads', 'courses'),
  ];

  const validDirs: string[] = [];
  const seen = new Set<string>();

  for (const d of dirs) {
    if (!seen.has(d)) {
      seen.add(d);
      try {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        validDirs.push(d);
      } catch (e) {
        // ignore invalid dirs
      }
    }
  }

  return validDirs.length > 0 ? validDirs : [path.join(process.cwd(), 'public', 'uploads', 'courses')];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file was provided in the request.' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const maxSize = isPdf ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;

    if (!ALLOWED_MIME_TYPES.has(mimeType) && !isPdf) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${mimeType}. Allowed formats: JPG, PNG, WEBP, SVG, PDF.` },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      const limitMb = isPdf ? '25MB' : '5MB';
      return NextResponse.json(
        { success: false, error: `File size exceeds the maximum limit of ${limitMb}.` },
        { status: 400 }
      );
    }

    // Sanitize filename & create unique name with timestamp
    const originalExt = path.extname(file.name) || (isPdf ? '.pdf' : '.png');
    const baseName = path
      .basename(file.name, originalExt)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);

    const uniqueFileName = `${baseName || 'upload'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${originalExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDirs = getUploadDirectories();

    for (const targetDir of uploadDirs) {
      try {
        const dest = path.join(targetDir, uniqueFileName);
        fs.writeFileSync(dest, buffer);
      } catch (err) {
        console.error(`[Upload Error] Failed to write to ${targetDir}:`, err);
      }
    }

    const publicUrl = `/uploads/courses/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      size: file.size,
      mimeType: mimeType,
    });
  } catch (error: any) {
    console.error('[Upload API Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during file upload.' },
      { status: 500 }
    );
  }
}
