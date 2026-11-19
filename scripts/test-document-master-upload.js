// ==============================================================================
// 10Q CHALLENGE LMS — STAGE 2A TEST SUITE
// Document Master: Secure PDF Upload & Management System QA
// ==============================================================================

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { getCommerceDb, closeCommerceDb } = require('../frontend/lib/learning/dist/commerce/db.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieHeader(probeResult) {
  const setCookie = probeResult.headers['set-cookie'];
  if (!setCookie) return '';
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

function getCsrfFromRes(probeResult) {
  const setCookie = probeResult.headers?.['set-cookie'] || [];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const match = c.match(/10q_csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

function httpProbe(urlStr, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(urlStr);
    const startTime = Date.now();
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            latency: Date.now() - startTime,
            json,
            text,
            buffer,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 0,
        latency: Date.now() - startTime,
        error: err,
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Builds a standard RFC 7578 multipart/form-data payload.
 */
function buildMultipartPayload(fields, files = []) {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(8).toString('hex');
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        )
      );
    }
  }

  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType || 'application/pdf'}\r\n\r\n`
      )
    );
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(chunks);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/**
 * Generates a valid minimal PDF buffer with '%PDF-' header and proper trailer.
 */
function createMinimalPdfBuffer(title = 'Sample Test Document') {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Title (${title}) /Creator (10Q Test Runner) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 712 Td
(${title}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
0000000264 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
357
%%EOF`;
  return Buffer.from(pdfString, 'utf8');
}

async function runStage2ATests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — STAGE 2A TEST SUITE');
  console.log('Document Master: Secure PDF Upload & Management Engine QA');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  const PORT = 3007;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  console.log('Resolving student identity & verifying Course 1 enrollment...');
  const authDbPath = path.resolve(__dirname, '..', 'database', '10q_auth_dev.db');
  const authDb = new DatabaseSync(authDbPath);
  const studentRow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('test.student@10qchallenge.in');
  const studentId = studentRow ? Number(studentRow.id) : 8;
  authDb.close();

  const preDb = await getCommerceDb();
  const existingEnr = await preDb.query(
    'SELECT id, access_state, settlement_status FROM commerce.enrollments WHERE user_id = $1 AND course_id = $2 LIMIT 1;',
    [studentId, '1']
  );
  if (existingEnr.rows && existingEnr.rows.length > 0) {
    await preDb.query(
      "UPDATE commerce.enrollments SET settlement_status = 'SETTLED', access_state = 'ACTIVE' WHERE user_id = $1 AND course_id = $2;",
      [studentId, '1']
    );
  } else {
    const orderRes = await preDb.query(
      `INSERT INTO commerce.orders (order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
         billing_full_name, billing_email, billing_state_code, status)
       VALUES ($1, $2, '1', 4999.00, 0.00, 4999.00, 'Student A', 'test.student@10qchallenge.in', 'DL', 'PAID')
       RETURNING id;`,
      [`ORD-DOC-${Date.now()}`, studentId]
    );
    const orderId = orderRes.rows[0].id;
    await preDb.query(
      `INSERT INTO commerce.payments (order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status)
       VALUES ($1, 'PAYU', $2, 4999.00, 'INR', 'SETTLED');`,
      [orderId, `PAY-DOC-${Date.now()}`]
    );
    await preDb.query(
      `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, access_state)
       VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', 'ACTIVE');`,
      [orderId, studentId]
    );
  }
  await closeCommerceDb();
  console.log('  ✓ Active settled enrollment ready for Student A -> Course 1');

  console.log(`Starting isolated test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: 'ignore',
  });

  // Wait for server to start
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await wait(400);
    const probe = await httpProbe(`${BASE_URL}/api/admin/overview`);
    if (probe.status === 401 || probe.status === 200 || probe.status === 403) {
      serverReady = true;
      break;
    }
  }

  if (!serverReady) {
    console.error('Failed to spawn server on port ' + PORT);
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Server online. Initiating test phases...\n');

  const createdDocIds = [];
  const createdPhysicalFiles = [];

  try {
    // --------------------------------------------------------------------------
    // PHASE 0: AUTHENTICATION
    // --------------------------------------------------------------------------
    console.log('--- Phase 0: Authentication Setup ---');
    const adminLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'AdminPass2026!' }),
    });

    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200 OK');
    const adminCookie = getCookieHeader(adminLoginRes);
    const adminCsrf = getCsrfFromRes(adminLoginRes);
    assert(adminCookie.length > 0, 'Admin session cookie retrieved');
    assert(adminCsrf.length > 0, 'Admin CSRF token retrieved');

    const studentLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });

    assert(studentLoginRes.status === 200, 'Student login succeeds with 200 OK');
    const studentCookie = getCookieHeader(studentLoginRes);
    const studentCsrf = getCsrfFromRes(studentLoginRes);
    assert(studentCookie.length > 0, 'Student session cookie retrieved');
    assert(studentCsrf.length > 0, 'Student CSRF token retrieved');

    // --------------------------------------------------------------------------
    // PHASE 1: ADMIN AUTHORIZATION & CSRF GUARDS
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 1: Authorization & Security Access Guards ---');

    const unauthPost = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacked Doc' }),
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/admin/documents rejected with 401 Unauthorized');

    const studentForbiddenPost = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie, 'x-csrf-token': studentCsrf },
      body: JSON.stringify({ title: 'Student Attempting Admin Post' }),
    });
    assert(studentForbiddenPost.status === 403, 'Student POST /api/admin/documents rejected with 403 Forbidden');

    const studentForbiddenDelete = await httpProbe(`${BASE_URL}/api/admin/documents/1`, {
      method: 'DELETE',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf },
    });
    assert(studentForbiddenDelete.status === 403, 'Student DELETE /api/admin/documents/1 rejected with 403 Forbidden');

    // 1.5 Unauthenticated DELETE
    const unauthDelete = await httpProbe(`${BASE_URL}/api/admin/documents/1`, {
      method: 'DELETE',
    });
    assert(unauthDelete.status === 401, 'Unauthenticated DELETE /api/admin/documents/1 rejected with 401 Unauthorized');

    // 1.6 Missing CSRF token (Authenticated Admin with cookie, but missing x-csrf-token header)
    const adminMissingCsrfPost = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ title: 'Missing CSRF Post' }),
    });
    assert(adminMissingCsrfPost.status === 403, 'Admin POST with missing CSRF token rejected with 403 Forbidden');
    assert(adminMissingCsrfPost.json?.error?.includes('CSRF'), 'Error specifically identifies CSRF token failure');

    // 1.7 Invalid/Spoofed CSRF token (Authenticated Admin with forged x-csrf-token header)
    const adminInvalidCsrfPost = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': 'attacker_invalid_csrf_token_xyz',
      },
      body: JSON.stringify({ title: 'Invalid CSRF Post' }),
    });
    assert(adminInvalidCsrfPost.status === 403, 'Admin POST with invalid CSRF token rejected with 403 Forbidden');
    assert(adminInvalidCsrfPost.json?.error?.includes('CSRF'), 'Error specifically identifies invalid CSRF token');

    // --------------------------------------------------------------------------
    // PHASE 2: SERVER-SIDE VALIDATION (MIME, MAGIC BYTES, TRUNCATION, FILE SIZE)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 2: Server-Side PDF Validation Engine ---');

    const storageDirBeforeValidation = path.resolve(__dirname, '..', 'storage', 'documents');
    const initialStorageFiles = fs.readdirSync(storageDirBeforeValidation);

    // 2.1 Invalid MIME type
    const fakeImagePayload = buildMultipartPayload(
      {
        title: 'Fake PNG disguised as PDF',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
      },
      [
        {
          name: 'file',
          filename: 'image.png',
          contentType: 'image/png',
          buffer: Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...'),
        },
      ]
    );

    const invalidMimeRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': fakeImagePayload.contentType },
      body: fakeImagePayload.body,
    });
    assert(invalidMimeRes.status === 400, 'Invalid MIME type (image/png) rejected with 400 Bad Request');
    assert(invalidMimeRes.json?.error?.includes('Invalid file type'), 'Error message reports invalid file type');

    // 2.2 Invalid magic bytes (named .pdf but contents are plain text)
    const fakeSignaturePayload = buildMultipartPayload(
      {
        title: 'Fake Text Document',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
      },
      [
        {
          name: 'file',
          filename: 'fake_notes.pdf',
          contentType: 'application/pdf',
          buffer: Buffer.concat([
            Buffer.from('This is a plain text file pretending to be a PDF document but has no PDF header! '),
            Buffer.alloc(40, 0x20),
            Buffer.from('%%EOF'),
          ]),
        },
      ]
    );

    const invalidSigRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': fakeSignaturePayload.contentType },
      body: fakeSignaturePayload.body,
    });
    assert(invalidSigRes.status === 400, 'Invalid magic bytes without %PDF- header rejected with 400 Bad Request');
    assert(invalidSigRes.json?.error?.includes('signature'), 'Error message identifies invalid file signature');

    // 2.3 Truncated PDF (has %PDF- but is only 20 bytes, below minimum valid PDF size)
    const truncatedPayload = buildMultipartPayload(
      {
        title: 'Truncated Short PDF',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
      },
      [
        {
          name: 'file',
          filename: 'truncated.pdf',
          contentType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\r\ntruncated!'),
        },
      ]
    );

    const truncatedRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': truncatedPayload.contentType },
      body: truncatedPayload.body,
    });
    assert(truncatedRes.status === 400, 'Truncated PDF (<64 bytes) rejected with 400 Bad Request');
    assert(truncatedRes.json?.error?.includes('truncated') || truncatedRes.json?.error?.includes('too small'), 'Error reports truncated or too small PDF');

    // 2.4 Missing %%EOF trailer marker (120 bytes long, has %PDF- header, but missing trailer %%EOF)
    const missingEofPayload = buildMultipartPayload(
      {
        title: 'Missing Trailer PDF',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
      },
      [
        {
          name: 'file',
          filename: 'no_eof.pdf',
          contentType: 'application/pdf',
          buffer: Buffer.concat([Buffer.from('%PDF-1.4\r\n1 0 obj\r\n<<>>\r\nendobj\r\n'), Buffer.alloc(80, 0x20)]),
        },
      ]
    );

    const missingEofRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': missingEofPayload.contentType },
      body: missingEofPayload.body,
    });
    assert(missingEofRes.status === 400, 'Malformed PDF without %%EOF trailer rejected with 400 Bad Request');
    assert(missingEofRes.json?.error?.includes('%%EOF'), 'Error specifically identifies missing %%EOF trailer marker');

    // 2.5 Oversized upload rejection
    const hugeBuffer = Buffer.alloc(26 * 1024 * 1024, 0x20); // 26 MB
    // Set PDF header so it passes magic check, but fails size check
    hugeBuffer[0] = 0x25;
    hugeBuffer[1] = 0x50;
    hugeBuffer[2] = 0x44;
    hugeBuffer[3] = 0x46;
    hugeBuffer[4] = 0x2d;

    const oversizedPayload = buildMultipartPayload(
      {
        title: 'Oversized Document',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
      },
      [
        {
          name: 'file',
          filename: 'oversized_test.pdf',
          contentType: 'application/pdf',
          buffer: hugeBuffer,
        },
      ]
    );

    const oversizedRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': oversizedPayload.contentType },
      body: oversizedPayload.body,
    });
    assert(oversizedRes.status === 400, 'Oversized upload (>25MB) rejected with 400 Bad Request');
    assert(oversizedRes.json?.error?.includes('exceeds maximum limit'), 'Error reports size limit exceeded');

    // 2.6 Orphan verification: confirm no physical file was saved during rejected validation phases
    const afterValidationStorageFiles = fs.readdirSync(storageDirBeforeValidation);
    const newlyCreatedOrphans = afterValidationStorageFiles.filter((f) => !initialStorageFiles.includes(f));
    assert(newlyCreatedOrphans.length === 0, 'Zero orphaned physical files created in storage/documents/ after validation rejections');

    // --------------------------------------------------------------------------
    // PHASE 3: PATH TRAVERSAL & UNSAFE FILENAMES DEFENSE
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 3: Path Traversal & Unsafe Filenames Defense ---');

    const validPdfBytes = createMinimalPdfBuffer('Path Traversal Test File');

    const traversalPayload = buildMultipartPayload(
      {
        title: 'Malicious Traversal Name',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
      },
      [
        {
          name: 'file',
          filename: '../../../../etc/passwd.pdf',
          contentType: 'application/pdf',
          buffer: validPdfBytes,
        },
      ]
    );

    const traversalRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': traversalPayload.contentType },
      body: traversalPayload.body,
    });

    assert(traversalRes.status === 201, 'Document with malicious original filename accepted cleanly');
    const createdTraversalDoc = traversalRes.json?.data;
    if (createdTraversalDoc) {
      createdDocIds.push(createdTraversalDoc.id);
      createdPhysicalFiles.push(createdTraversalDoc.storedFilename);

      assert(
        !createdTraversalDoc.storedFilename.includes('..') && !createdTraversalDoc.storedFilename.includes('/'),
        'Stored filename safely neutralized without directory traversal sequences'
      );
      assert(
        createdTraversalDoc.storedFilename.startsWith('doc_') && createdTraversalDoc.storedFilename.endsWith('.pdf'),
        'Generated storage filename follows safe naming convention'
      );
      assert(
        !createdTraversalDoc.fileUrl.includes('..'),
        'Relative fileUrl does not expose server directory traversal'
      );
    }

    // --------------------------------------------------------------------------
    // PHASE 4: ACADEMIC HIERARCHY INTEGRATION & MISMATCH GUARDS
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 4: Academic Hierarchy Validation & Mismatch Guards ---');

    // 4.1 Hierarchy mismatch: Chapter 5 belongs to Course 2, but submitted with Course 1
    const mismatchPayload = buildMultipartPayload(
      {
        title: 'Mismatched Chapter Doc',
        courseId: '1',
        subjectId: '1',
        chapterId: '5', // Chapter 5 belongs to Course 2
      },
      [
        {
          name: 'file',
          filename: 'valid.pdf',
          contentType: 'application/pdf',
          buffer: validPdfBytes,
        },
      ]
    );

    const mismatchRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': mismatchPayload.contentType },
      body: mismatchPayload.body,
    });

    assert(mismatchRes.status === 400, 'Cross-course hierarchy mismatch (Chapter 5 in Course 1) rejected with 400');
    assert(mismatchRes.json?.error?.includes('Hierarchy mismatch'), 'Hierarchy mismatch error specifically reported');

    // 4.2 Non-existent course
    const badCoursePayload = buildMultipartPayload(
      {
        title: 'Bad Course Doc',
        courseId: '99999',
        subjectId: '1',
        chapterId: '1',
      },
      [{ name: 'file', filename: 'valid.pdf', contentType: 'application/pdf', buffer: validPdfBytes }]
    );

    const badCourseRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': badCoursePayload.contentType },
      body: badCoursePayload.body,
    });
    assert(badCourseRes.status === 400, 'Non-existent Course #99999 rejected with 400 Bad Request');

    // 4.3 Orphan check for hierarchy mismatch
    const afterHierarchyStorageFiles = fs.readdirSync(storageDirBeforeValidation);
    const hierarchyOrphans = afterHierarchyStorageFiles.filter(
      (f) => !initialStorageFiles.includes(f) && !createdPhysicalFiles.includes(f)
    );
    assert(hierarchyOrphans.length === 0, 'Zero orphaned physical files created after academic hierarchy validation rejection');

    // --------------------------------------------------------------------------
    // PHASE 5: SUCCESSFUL UPLOAD & METADATA PERSISTENCE
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 5: Successful Upload & Metadata Persistence ---');

    const authenticDocTitle = 'Rotational Mechanics Topper Formula Cheat-Sheet';
    const genuinePdf = createMinimalPdfBuffer(authenticDocTitle);

    const validUploadPayload = buildMultipartPayload(
      {
        title: authenticDocTitle,
        description: 'Complete moment of inertia formulas, parallel axis theorem, and rolling shortcuts.',
        category: 'Formula Sheet',
        courseId: '1',
        subjectId: '1',
        chapterId: '1',
        topicId: '1',
        displayOrder: '4',
        pageCount: '16',
        status: 'Published',
      },
      [
        {
          name: 'file',
          filename: 'Physics_Rotational_Formulas.pdf',
          contentType: 'application/pdf',
          buffer: genuinePdf,
        },
      ]
    );

    const uploadRes = await httpProbe(`${BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': validUploadPayload.contentType },
      body: validUploadPayload.body,
    });

    assert(uploadRes.status === 201, 'Valid PDF upload returns 201 Created');
    assert(uploadRes.json?.success === true, 'Response JSON confirms success');

    const newDoc = uploadRes.json?.data;
    assert(Boolean(newDoc && newDoc.id), 'Generated Document ID returned');
    if (newDoc) {
      createdDocIds.push(newDoc.id);
      createdPhysicalFiles.push(newDoc.storedFilename);

      assert(newDoc.title === authenticDocTitle, 'Document title persisted correctly');
      assert(newDoc.category === 'Formula Sheet', 'Document category persisted correctly');
      assert(newDoc.courseId === 1, 'Course ID persisted correctly');
      assert(newDoc.subject === 'Physics', 'Subject name derived correctly');
      assert(newDoc.chapter === 'Mechanics & Kinematics', 'Chapter name derived correctly');
      assert(newDoc.topicName === 'Vectors & Coordinate Systems', 'Topic name derived correctly');
      assert(newDoc.fileType === 'PDF', 'File type strictly set to PDF');
      assert(newDoc.status === 'Published', 'Status set to Published');
      assert(newDoc.displayOrder === 4, 'Display order persisted');
      assert(newDoc.originalFilename === 'Physics_Rotational_Formulas.pdf', 'Original filename recorded');
      assert(Boolean(newDoc.storedFilename), 'Stored unique filename recorded');

      // Verify physical presence in private document storage
      const storageFile = path.resolve(__dirname, '..', 'storage', 'documents', newDoc.storedFilename);
      assert(fs.existsSync(storageFile), 'Physical PDF file exists in private storage/documents/');
      const fileBytes = fs.readFileSync(storageFile);
      assert(fileBytes.slice(0, 5).toString('utf8') === '%PDF-', 'Stored file begins with %PDF- header');

      // ------------------------------------------------------------------------
      // PHASE 6: SAFE REPLACEMENT WORKFLOW
      // ------------------------------------------------------------------------
      console.log('\n--- Phase 6: Safe File Replacement Workflow ---');

      const updatedTitle = 'Rotational Mechanics Formula Cheat-Sheet (Updated Edition)';
      const replacementPdf = createMinimalPdfBuffer(updatedTitle);

      const replacePayload = buildMultipartPayload(
        {
          title: updatedTitle,
          category: 'Revision Notes',
          courseId: '1',
          subjectId: '1',
          chapterId: '1',
          displayOrder: '2',
        },
        [
          {
            name: 'file',
            filename: 'Physics_Rotational_Formulas_v2.pdf',
            contentType: 'application/pdf',
            buffer: replacementPdf,
          },
        ]
      );

      const updateRes = await httpProbe(`${BASE_URL}/api/admin/documents/${newDoc.id}`, {
        method: 'PUT',
        headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': replacePayload.contentType },
        body: replacePayload.body,
      });

      assert(updateRes.status === 200, 'Document update and file replacement returns 200 OK');
      const updatedDoc = updateRes.json?.data;
      assert(updatedDoc?.title === updatedTitle, 'Updated document title persisted');
      assert(updatedDoc?.category === 'Revision Notes', 'Updated document category persisted');
      assert(
        updatedDoc?.storedFilename !== newDoc.storedFilename,
        'Replacement file assigned a new unique storage filename'
      );

      if (updatedDoc?.storedFilename) {
        createdPhysicalFiles.push(updatedDoc.storedFilename);
        const newStorageFile = path.resolve(__dirname, '..', 'storage', 'documents', updatedDoc.storedFilename);
        assert(fs.existsSync(newStorageFile), 'New replacement physical file exists in storage');
        // Old orphaned file should be cleanly removed
        assert(!fs.existsSync(storageFile), 'Previous physical file safely deleted after replacement');
      }

      // ------------------------------------------------------------------------
      // PHASE 7: STUDENT CLASSROOM INTEGRATION & PROTECTED DELIVERY
      // ------------------------------------------------------------------------
      console.log('\n--- Phase 7: Student Classroom Integration & Protected Delivery ---');

      // 7.1 Verify curriculum integration
      const curriculumRes = await httpProbe(`${BASE_URL}/api/student/classroom/1`, {
        headers: { Cookie: studentCookie },
      });
      assert(curriculumRes.status === 200, 'Student classroom curriculum returns 200 OK', `Status: ${curriculumRes.status}, data: ${JSON.stringify(curriculumRes.json)}`);
      const subjects = curriculumRes.json?.data?.subjects;
      assert(Array.isArray(subjects), 'Curriculum hierarchy returned to student');

      let foundInClassroom = false;
      if (Array.isArray(subjects)) {
        for (const sub of subjects) {
          for (const ch of sub.chapters || []) {
            for (const docItem of ch.documents || []) {
              if (docItem.id === newDoc.id) {
                foundInClassroom = true;
                assert(docItem.title === updatedTitle, 'Classroom displays updated document title');
                assert(docItem.fileType === 'PDF', 'Classroom lists document format as PDF');
              }
            }
          }
        }
      }
      assert(foundInClassroom, 'Newly uploaded document dynamically appears in Student Classroom curriculum');

      // 7.2 Student delivery - Unauthorized student (no session)
      const unauthDocDelivery = await httpProbe(`${BASE_URL}/api/student/classroom/1/document/${newDoc.id}`);
      assert(unauthDocDelivery.status === 401, 'Unauthenticated student document delivery rejected with 401');

      // 7.2b Ineligible student delivery - Authenticated student with NO enrollment (Student Zero)
      const studentZeroLogin = await httpProbe(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student.zero.enrollment@example.com', password: 'StudentPass2026!' }),
      });
      const studentZeroCookie = getCookieHeader(studentZeroLogin);
      const studentZeroDelivery = await httpProbe(`${BASE_URL}/api/student/classroom/1/document/${newDoc.id}`, {
        headers: { Cookie: studentZeroCookie },
      });
      assert(studentZeroDelivery.status === 403, 'Ineligible student (no enrollment) document delivery rejected with 403 Forbidden');
      assert(studentZeroDelivery.json?.error?.includes('enrollment'), 'Error communicates missing active settled enrollment');

      // 7.2c Cross-course document IDOR attempt:
      // Student A (enrolled in Course 1) attempts to fetch document under non-enrolled Course 2:
      const crossCourseDocRes = await httpProbe(`${BASE_URL}/api/student/classroom/2/document/${newDoc.id}`, {
        headers: { Cookie: studentCookie },
      });
      assert(crossCourseDocRes.status === 403, 'Cross-course document access by ineligible course ID rejected with 403 Forbidden');

      // 7.3 Student delivery - Eligible enrolled student
      const studentDeliveryRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/document/${newDoc.id}`, {
        headers: { Cookie: studentCookie },
      });
      assert(studentDeliveryRes.status === 200, 'Eligible student document delivery streams with 200 OK');
      assert(
        studentDeliveryRes.headers['content-type'] === 'application/pdf',
        'Delivery headers enforce Content-Type: application/pdf'
      );
      assert(
        studentDeliveryRes.headers['x-content-type-options'] === 'nosniff',
        'Delivery headers enforce X-Content-Type-Options: nosniff'
      );
      assert(
        studentDeliveryRes.headers['cache-control'] === 'private, no-cache, no-store, must-revalidate',
        'Delivery headers strictly enforce Cache-Control: private, no-cache, no-store, must-revalidate'
      );
      assert(
        studentDeliveryRes.buffer.slice(0, 5).toString('utf8') === '%PDF-',
        'Delivered stream content begins with %PDF- header'
      );

      // 7.4 Learning Progress Mutation with new document
      const progressRes = await httpProbe(`${BASE_URL}/api/student/progress/content`, {
        method: 'POST',
        headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: 1,
          contentType: 'PDF',
          contentIdentifier: String(newDoc.id),
          status: 'COMPLETED',
        }),
      });

      assert(progressRes.status === 200, 'Student can record learning progress for newly uploaded document');
      assert(progressRes.json?.data?.record?.status === 'COMPLETED', 'Progress record saved as COMPLETED');

      // ------------------------------------------------------------------------
      // PHASE 8: DELETION SAFEGUARDS & CANONICAL FIXTURE PROTECTION
      // ------------------------------------------------------------------------
      console.log('\n--- Phase 8: Deletion Safeguards & Canonical Fixture Protection ---');

      // 8.1 Attempt to delete document that has active student progress
      const deleteWithProgressRes = await httpProbe(`${BASE_URL}/api/admin/documents/${newDoc.id}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
      });

      // Should be rejected or warned due to active progress dependency
      assert(
        deleteWithProgressRes.status === 400 && deleteWithProgressRes.json?.error?.includes('progress'),
        'Deletion blocked when active student learning progress records depend on document'
      );

      // 8.2 Canonical Fixtures Protection Check
      // Attempt to delete canonical document #1 (Kinematics & Mechanics Formula Handbook)
      // Even if metadata record was manipulated, the physical file must NEVER be deleted
      const canonicalFixturePath = path.resolve(
        __dirname,
        '..',
        'storage',
        'documents',
        'physics-mechanics-formula-sheet.pdf'
      );
      assert(fs.existsSync(canonicalFixturePath), 'Canonical fixture physics-mechanics-formula-sheet.pdf exists');

      // Call delete API for canonical doc 1
      const deleteCanonicalRes = await httpProbe(`${BASE_URL}/api/admin/documents/1`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
      });

      // Verify canonical file was NOT deleted from storage
      assert(
        fs.existsSync(canonicalFixturePath),
        'Canonical physical fixture STRICTLY PRESERVED from disk deletion'
      );

      // Restore canonical doc 1 in documents.json if test modified it
      const currentDocs = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '..', 'data', 'documents.json'), 'utf8')
      );
      if (!currentDocs.some((d) => d.id === 1)) {
        currentDocs.unshift({
          id: 1,
          title: 'Kinematics & Mechanics Formula Handbook',
          subject: 'Physics',
          chapter: 'Mechanics & Kinematics',
          category: 'Formula Sheet',
          courseId: 1,
          courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
          subjectId: 1,
          chapterId: 1,
          fileType: 'PDF',
          fileUrl: '/documents/physics-mechanics-formula-sheet.pdf',
          storedFilename: 'physics-mechanics-formula-sheet.pdf',
          originalFilename: 'physics-mechanics-formula-sheet.pdf',
          fileSizeBytes: '2.4 MB',
          pageCount: 14,
          description: 'Comprehensive 1-pager summary cards and formula sheet curated for quick revision.',
          status: 'Published',
          displayOrder: 1,
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
          createdBy: 'System',
        });
        fs.writeFileSync(
          path.resolve(__dirname, '..', 'data', 'documents.json'),
          JSON.stringify(currentDocs, null, 2),
          'utf8'
        );
        fs.writeFileSync(
          path.resolve(__dirname, '..', 'frontend', 'data', 'documents.json'),
          JSON.stringify(currentDocs, null, 2),
          'utf8'
        );
        console.log('  ✓ Re-verified canonical document #1 in JSON data store');
      }
    }
  } finally {
    // --------------------------------------------------------------------------
    // CLEANUP DISPOSABLE FIXTURES
    // --------------------------------------------------------------------------
    console.log('\n--- Cleaning up temporary test fixtures ---');
    try {
      // Remove temporary docs from JSON
      const dataPaths = [
        path.resolve(__dirname, '..', 'data', 'documents.json'),
        path.resolve(__dirname, '..', 'frontend', 'data', 'documents.json'),
      ];

      for (const p of dataPaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const docs = JSON.parse(raw);
          const filtered = docs.filter((d) => !createdDocIds.includes(d.id));
          fs.writeFileSync(p, JSON.stringify(filtered, null, 2), 'utf8');
        }
      }

      // Remove temporary physical PDF files from storage/documents
      for (const f of createdPhysicalFiles) {
        if (f) {
          const p = path.resolve(__dirname, '..', 'storage', 'documents', f);
          if (fs.existsSync(p)) {
            try {
              fs.unlinkSync(p);
            } catch {}
          }
        }
      }
      console.log(`  ✓ Cleaned up ${createdDocIds.length} test records and temporary physical PDFs.`);
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }

    serverProcess.kill('SIGTERM');
    await wait(600);
    try {
      const cleanupDb = await getCommerceDb();
      if (createdDocIds.length > 0) {
        await cleanupDb.query(
          "DELETE FROM learning.student_content_progress WHERE content_type = 'PDF' AND content_identifier = ANY($1);",
          [createdDocIds.map(String)]
        );
      }
      await closeCommerceDb();
    } catch {}
  }

  console.log('\n================================================================');
  console.log(`STAGE 2A TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage2ATests().catch((err) => {
  console.error('Unhandled fatal error in test suite:', err);
  process.exit(1);
});
