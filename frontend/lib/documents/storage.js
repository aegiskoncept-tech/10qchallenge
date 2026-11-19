const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CANONICAL_PROTECTED_FIXTURES = [
  'chemistry-atomic-structure-mindmap.pdf',
  'math-calculus-super-tricks.pdf',
  'physics-mechanics-formula-sheet.pdf',
];

const MAX_PDF_UPLOAD_SIZE = 25 * 1024 * 1024;

function getPrivateDocumentStorageDir() {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'storage', 'documents'), path.join(persistentDir, 'documents')] : []),
    path.join(cwd, 'storage', 'documents'),
    path.join(cwd, 'frontend', 'storage', 'documents'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  const fallback = persistentDir ? path.join(persistentDir, 'storage', 'documents') : path.join(cwd, 'storage', 'documents');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

function validatePdfBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file provided. Document payload cannot be zero bytes.' };
  }

  if (buffer.length > MAX_PDF_UPLOAD_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the maximum permitted limit of ${MAX_PDF_UPLOAD_SIZE / (1024 * 1024)}MB.`,
    };
  }

  // Minimum realistic size for a valid PDF structure (header, catalog, pages, xref, trailer, %%EOF)
  if (buffer.length < 64) {
    return { valid: false, error: 'File is too small or truncated to be a valid PDF document.' };
  }

  const isPdfMagic =
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d;

  if (!isPdfMagic) {
    return {
      valid: false,
      error: 'Invalid file signature. File header does not match the PDF standard (%PDF-).',
    };
  }

  // Structural check: Every conforming PDF must terminate with '%%EOF' (ISO 32000-1)
  const searchTail = buffer.slice(Math.max(0, buffer.length - 2048));
  if (!searchTail.includes(Buffer.from('%%EOF'))) {
    return {
      valid: false,
      error: 'Malformed or truncated PDF. Missing required PDF end-of-file trailer marker (%%EOF).',
    };
  }

  return { valid: true };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function savePrivatePdfFile(buffer, originalFilename) {
  const validation = validatePdfBuffer(buffer);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const storageDir = path.resolve(getPrivateDocumentStorageDir());
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const cleanOriginal = originalFilename
    ? path
        .basename(originalFilename, path.extname(originalFilename))
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 32)
    : 'doc';

  const randomHex = crypto.randomBytes(4).toString('hex');
  const storedFilename = `doc_${Date.now()}_${cleanOriginal ? cleanOriginal + '_' : ''}${randomHex}.pdf`;
  const targetFilePath = path.join(storageDir, storedFilename);

  try {
    fs.writeFileSync(targetFilePath, buffer);
    return {
      success: true,
      storedFilename,
      fileUrl: `/documents/${storedFilename}`,
      fileSizeBytes: formatFileSize(buffer.length),
    };
  } catch (err) {
    console.error('[savePrivatePdfFile Error]', err);
    return { success: false, error: 'Failed to write document to private storage.' };
  }
}

function deletePrivatePdfFile(storedFilenameOrUrl) {
  if (!storedFilenameOrUrl) {
    return { success: true, deleted: false };
  }

  const cleanFilename = path.basename(storedFilenameOrUrl.trim());

  if (CANONICAL_PROTECTED_FIXTURES.includes(cleanFilename)) {
    return { success: true, deleted: false };
  }

  const storageDir = path.resolve(getPrivateDocumentStorageDir());
  const filePath = path.resolve(storageDir, cleanFilename);

  const storageWithSep = storageDir.endsWith(path.sep) ? storageDir : storageDir + path.sep;
  if (!filePath.startsWith(storageWithSep)) {
    return { success: false, error: 'Path traversal sequence is strictly prohibited.' };
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, deleted: true };
    }
    return { success: true, deleted: false };
  } catch (err) {
    console.error('[deletePrivatePdfFile Error]', err);
    return { success: false, error: 'Failed to delete file from storage.' };
  }
}

function resolvePrivatePdfFile(fileUrlOrName) {
  if (!fileUrlOrName || typeof fileUrlOrName !== 'string') {
    return { success: false, error: 'Invalid document identifier or filename.' };
  }

  if (fileUrlOrName.indexOf('\0') !== -1) {
    return { success: false, error: 'Path traversal / invalid characters detected.' };
  }

  if (
    fileUrlOrName.includes('..') ||
    fileUrlOrName.includes('%2e%2e') ||
    fileUrlOrName.includes('%2E%2E')
  ) {
    return { success: false, error: 'Path traversal sequence is strictly prohibited.' };
  }

  const cleanFilename = path.basename(fileUrlOrName.trim());

  if (
    cleanFilename.includes('..') ||
    cleanFilename.includes('/') ||
    cleanFilename.includes('\\') ||
    cleanFilename.startsWith('.')
  ) {
    return { success: false, error: 'Path traversal sequence is strictly prohibited.' };
  }

  if (!cleanFilename.toLowerCase().endsWith('.pdf')) {
    return { success: false, error: 'Unsupported file type. Only PDF documents are allowed.' };
  }

  const storageDir = path.resolve(getPrivateDocumentStorageDir());
  const resolvedPath = path.resolve(storageDir, cleanFilename);

  const storageWithSep = storageDir.endsWith(path.sep) ? storageDir : storageDir + path.sep;
  if (!resolvedPath.startsWith(storageWithSep)) {
    return { success: false, error: 'Resolved path escapes private storage boundary.' };
  }

  if (!fs.existsSync(resolvedPath)) {
    return { success: false, filename: cleanFilename, error: 'Document file not found on server.' };
  }

  return {
    success: true,
    filePath: resolvedPath,
    filename: cleanFilename,
  };
}

module.exports = {
  CANONICAL_PROTECTED_FIXTURES,
  MAX_PDF_UPLOAD_SIZE,
  getPrivateDocumentStorageDir,
  validatePdfBuffer,
  formatFileSize,
  savePrivatePdfFile,
  deletePrivatePdfFile,
  resolvePrivatePdfFile,
};
