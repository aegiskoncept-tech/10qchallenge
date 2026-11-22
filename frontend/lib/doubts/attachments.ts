import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DoubtAttachmentItem } from './types';
import { getCommerceDb } from '@/lib/commerce/db';

export interface AttachmentOwnershipResult {
  authorized: boolean;
  status: 200 | 400 | 403 | 404 | 500;
  error?: string;
  metadata?: {
    doubtId: number;
    replyId: number;
    studentId: number;
    visibility: 'STUDENT_VISIBLE' | 'INTERNAL_NOTE';
    assignedFacultyId?: number | null;
  };
}

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export function getDoubtAttachmentStorageDir(): string {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir
      ? [
          path.join(persistentDir, 'storage', 'doubt_attachments'),
          path.join(persistentDir, 'doubt_attachments'),
        ]
      : []),
    path.join(cwd, 'storage', 'doubt_attachments'),
    path.join(cwd, 'frontend', 'storage', 'doubt_attachments'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  const fallback = persistentDir
    ? path.join(persistentDir, 'storage', 'doubt_attachments')
    : path.join(cwd, 'storage', 'doubt_attachments');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

export function validateAttachmentBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Attachment file is empty.' };
  }

  if (buffer.length > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: `Attachment size exceeds maximum limit of ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB.`,
    };
  }

  const ext = path.extname(filename || '').toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension "${ext}". Allowed types: PDF, JPG, PNG, WEBP.`,
    };
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid MIME type "${mimeType}". Allowed types: PDF, JPEG, PNG, WEBP.`,
    };
  }

  // Magic bytes inspection
  if (ext === '.pdf') {
    const isPdfMagic =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d;
    if (!isPdfMagic) {
      return { valid: false, error: 'File header does not match standard PDF (%PDF-).' };
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    const isJpegMagic = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpegMagic) {
      return { valid: false, error: 'File header does not match standard JPEG image.' };
    }
  } else if (ext === '.png') {
    const isPngMagic =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    if (!isPngMagic) {
      return { valid: false, error: 'File header does not match standard PNG image.' };
    }
  } else if (ext === '.webp') {
    const isRiff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    if (!isRiff) {
      return { valid: false, error: 'File header does not match standard WEBP image.' };
    }
  }

  return { valid: true };
}

export function saveDoubtAttachment(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): { success: boolean; attachment?: DoubtAttachmentItem; error?: string } {
  const validation = validateAttachmentBuffer(buffer, originalFilename, mimeType);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const storageDir = path.resolve(getDoubtAttachmentStorageDir());
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const ext = path.extname(originalFilename || '.bin').toLowerCase();
  const cleanOriginal = path
    .basename(originalFilename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 32);

  const randomHex = crypto.randomBytes(6).toString('hex');
  const storedFilename = `doubt_${Date.now()}_${cleanOriginal}_${randomHex}${ext}`;
  const targetFilePath = path.join(storageDir, storedFilename);

  try {
    fs.writeFileSync(targetFilePath, buffer);
    const attachment: DoubtAttachmentItem = {
      id: `att_${Date.now()}_${randomHex}`,
      filename: storedFilename,
      originalFilename,
      mimeType,
      sizeBytes: buffer.length,
      url: `/api/student/doubts/attachments/${storedFilename}`,
    };
    return { success: true, attachment };
  } catch (err: any) {
    console.error('[saveDoubtAttachment Error]', err);
    return { success: false, error: 'Failed to write attachment to disk.' };
  }
}

export function resolveDoubtAttachmentFile(filename: string): {
  success: boolean;
  filePath?: string;
  error?: string;
} {
  if (!filename || typeof filename !== 'string') {
    return { success: false, error: 'Invalid filename.' };
  }

  if (filename.indexOf('\0') !== -1 || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { success: false, error: 'Path traversal sequence is strictly prohibited.' };
  }

  const clean = path.basename(filename.trim());
  const storageDir = path.resolve(getDoubtAttachmentStorageDir());
  const resolvedPath = path.resolve(storageDir, clean);

  const storageWithSep = storageDir.endsWith(path.sep) ? storageDir : storageDir + path.sep;
  if (!resolvedPath.startsWith(storageWithSep)) {
    return { success: false, error: 'Resolved path escapes storage boundary.' };
  }

  if (!fs.existsSync(resolvedPath)) {
    return { success: false, error: 'Attachment file not found.' };
  }

  return { success: true, filePath: resolvedPath };
}

/**
 * Authoritative ownership & authorization verification for doubt attachments.
 * Resolves the exact attachment metadata in PostgreSQL learning.doubt_replies,
 * identifies its parent doubt and visibility, and enforces strict role-based access.
 */
export async function verifyDoubtAttachmentOwnership(
  filename: string,
  user: { id: number; role: string }
): Promise<AttachmentOwnershipResult> {
  if (!filename || typeof filename !== 'string') {
    return {
      authorized: false,
      status: 400,
      error: 'Invalid attachment filename.',
    };
  }

  try {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT r.id AS reply_id,
              r.doubt_id,
              r.visibility,
              r.author_id,
              r.author_role,
              d.student_id,
              d.assigned_faculty_id
       FROM learning.doubt_replies r
       JOIN learning.student_doubts d ON d.id = r.doubt_id
       WHERE r.attachments @> $1::jsonb
       LIMIT 2;`,
      [JSON.stringify([{ filename }])]
    );

    // Fail closed: Filename has no associated database metadata record
    if (res.rows.length === 0) {
      return {
        authorized: false,
        status: 404,
        error: 'Attachment not found or no associated record exists.',
      };
    }

    // Fail closed: Ambiguous ownership
    if (res.rows.length > 1) {
      return {
        authorized: false,
        status: 403,
        error: 'Ambiguous attachment ownership.',
      };
    }

    const row = res.rows[0];
    const doubtId = Number(row.doubt_id);
    const replyId = Number(row.reply_id);
    const studentId = Number(row.student_id);
    const assignedFacultyId = row.assigned_faculty_id ? Number(row.assigned_faculty_id) : null;
    const authorId = Number(row.author_id);
    const visibility = row.visibility as 'STUDENT_VISIBLE' | 'INTERNAL_NOTE';

    const metadata = {
      doubtId,
      replyId,
      studentId,
      visibility,
      assignedFacultyId,
    };

    // 1. Internal Staff Note Attachment Restrictions
    if (visibility === 'INTERNAL_NOTE') {
      if (user.role === 'STUDENT') {
        return {
          authorized: false,
          status: 403,
          error: 'Forbidden: Access to confidential staff attachment is denied.',
          metadata,
        };
      }
      if (user.role === 'FACULTY') {
        const isAssigned = assignedFacultyId === Number(user.id);
        const isAuthor = authorId === Number(user.id);
        if (!isAssigned && !isAuthor) {
          return {
            authorized: false,
            status: 403,
            error: 'Forbidden: You are not assigned to this doubt.',
            metadata,
          };
        }
      }
      // ADMIN or assigned/author FACULTY is authorized
      return { authorized: true, status: 200, metadata };
    }

    // 2. Public / Student-Visible Attachment Restrictions
    if (user.role === 'STUDENT') {
      if (studentId !== Number(user.id)) {
        return {
          authorized: false,
          status: 403,
          error: 'Forbidden: You do not have permission to access another student\'s attachment.',
          metadata,
        };
      }
      return { authorized: true, status: 200, metadata };
    }

    if (user.role === 'FACULTY') {
      const isAssigned = assignedFacultyId === Number(user.id);
      const isAuthor = authorId === Number(user.id);
      if (!isAssigned && !isAuthor) {
        return {
          authorized: false,
          status: 403,
          error: 'Forbidden: You are not assigned to this doubt.',
          metadata,
        };
      }
      return { authorized: true, status: 200, metadata };
    }

    // ADMIN role is authorized across the platform
    if (user.role === 'ADMIN') {
      return { authorized: true, status: 200, metadata };
    }

    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: Unknown or unauthorized user role.',
    };
  } catch (err: any) {
    console.error('[verifyDoubtAttachmentOwnership Error]', err);
    return {
      authorized: false,
      status: 500,
      error: 'Database ownership lookup failure.',
    };
  }
}
