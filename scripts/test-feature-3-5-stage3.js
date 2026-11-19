// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.5 STAGE 3 AUTOMATED TEST SUITE
// Protected Video Playback & Document Delivery Engine Verification
// ==============================================================================

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieHeader(probeResult) {
  const setCookie = probeResult.headers['set-cookie'];
  if (!setCookie) return '';
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

async function probeUrl(url, options = {}) {
  const parsed = new URL(url);
  const startTime = Date.now();

  return new Promise((resolve) => {
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

function checkForForbiddenKeys(obj, forbiddenKeys, path = '') {
  const violations = [];
  if (!obj || typeof obj !== 'object') return violations;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (forbiddenKeys.includes(key)) {
      violations.push(`${currentPath} contains forbidden key '${key}'`);
    }
    if (typeof value === 'string') {
      if (
        value.includes('vimeo_private') ||
        value.includes('client_secret') ||
        value.includes('api_secret') ||
        value.includes('accessToken')
      ) {
        violations.push(`${currentPath} contains sensitive substring`);
      }
    }
    if (typeof value === 'object' && value !== null) {
      violations.push(...checkForForbiddenKeys(value, forbiddenKeys, currentPath));
    }
  }
  return violations;
}

async function runStage3Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.5 STAGE 3 TEST SUITE');
  console.log('Protected Video Playback & Document Delivery Engine QA');
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

  // --- PART 1: STORAGE & IDENTITY RESOLUTION ---
  console.log('--- 1. Storage & Identity Resolution ---');
  const authDbPath = path.join(process.cwd(), 'database', '10q_auth_dev.db');
  assert(fs.existsSync(authDbPath), 'database/10q_auth_dev.db exists');

  const authDb = new DatabaseSync(authDbPath);
  const studentARow = authDb.prepare('SELECT id, email, passwordHash FROM users WHERE email = ?').get('test.student@10qchallenge.in');
  const studentBRow = authDb.prepare('SELECT id, email, passwordHash FROM users WHERE email = ?').get('student.isolation.test@example.com');
  const studentAId = studentARow ? Number(studentARow.id) : 8;
  const studentBId = studentBRow ? Number(studentBRow.id) : 35;
  const commonPasswordHash = studentARow ? studentARow.passwordHash : '';

  // Seed or replace clean un-enrolled student (Student Zero)
  authDb.prepare(
    `INSERT OR REPLACE INTO users (id, fullName, email, mobileNumber, passwordHash, role, targetExam, isActive, createdAt, updatedAt)
     VALUES (999, 'Student Zero', 'student.zero.enrollment@example.com', '9876543210', ?, 'STUDENT', 'JEE Main', 1, datetime('now'), datetime('now'));`
  ).run(commonPasswordHash);

  const studentZeroRow = authDb.prepare('SELECT id, email FROM users WHERE id = 999').get();
  const studentZeroId = studentZeroRow ? Number(studentZeroRow.id) : 999;
  authDb.close();

  assert(Boolean(studentAId), `Student A resolved with ID ${studentAId}`);
  assert(Boolean(studentBId), `Student B resolved with ID ${studentBId}`);
  assert(Boolean(studentZeroId), `Student Zero resolved with ID ${studentZeroId}`);

  const { getCommerceDb, closeCommerceDb } = require('../frontend/lib/learning/dist/commerce/db.js');
  const { LearningProgressService } = require('../frontend/lib/learning/dist/learning/progress-service.js');
  let db = await getCommerceDb();

  // Clear existing learning & commerce fixture records for test isolation
  const allUserIds = [studentAId, studentBId, studentZeroId];
  await db.query('DELETE FROM learning.student_learning_events WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_content_progress WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM commerce.enrollments WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
  await db.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
  await db.query('DELETE FROM commerce.orders WHERE user_id = ANY($1);', [allUserIds]);

  console.log('  ✓ Test tables cleared for clean boundary testing');

  // --- PART 2: SERVICE-LEVEL ENROLLMENT VERIFICATION ACROSS ALL 12 STATES ---
  console.log('\n--- 2. Service-Layer Enrollment Authorization Across All 12 States ---');

  // Temporarily adjust check constraint and foreign key to test synthetic non-settled rows
  await db.query('ALTER TABLE commerce.enrollments DROP CONSTRAINT IF EXISTS chk_enrollment_source_status;');
  await db.query('ALTER TABLE commerce.enrollments DROP CONSTRAINT IF EXISTS fk_enrollment_payment_settlement;');

  const statesToTest = [
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'ACTIVE', expected: true, label: 'SETTLED + ACTIVE' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'PROVISIONED', expected: true, label: 'SETTLED + PROVISIONED' },
    { type: 'COMMERCE', settlement: 'PENDING', access: 'PENDING', expected: false, label: 'PENDING (settlement & access)' },
    { type: 'COMMERCE', settlement: 'PROCESSING', access: 'PENDING', expected: false, label: 'PROCESSING (settlement)' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'EXPIRED', expected: false, label: 'SETTLED + EXPIRED' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'REVOKED', expected: false, label: 'SETTLED + REVOKED' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'SUSPENDED', expected: false, label: 'SETTLED + SUSPENDED' },
    { type: 'COMMERCE', settlement: 'REVERSED', access: 'REVOKED', expected: false, label: 'REVERSED + REVOKED' },
    { type: 'COMMERCE', settlement: 'CANCELLED', access: 'CANCELLED', expected: false, label: 'CANCELLED + CANCELLED' },
    { type: 'COMMERCE', settlement: 'FAILED', access: 'FAILED', expected: false, label: 'FAILED + FAILED' },
    { type: 'LEGACY', settlement: 'UNVERIFIED_HISTORICAL', access: 'PENDING', expected: false, label: 'UNVERIFIED_HISTORICAL + PENDING' },
    { type: 'NO_RECORD', expected: false, label: 'NO RECORD (Student Zero)' },
  ];

  for (const item of statesToTest) {
    let enrollmentId = null;

    if (item.type === 'COMMERCE') {
      const enrRes = await db.query(
        `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
         VALUES ($1, '1', $2, 'COMMERCE_ORDER', NOW(), $3)
         RETURNING id;`,
        [studentZeroId, item.settlement, item.access]
      );
      enrollmentId = enrRes.rows[0].id;
    } else if (item.type === 'LEGACY') {
      const enrRes = await db.query(
        `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
         VALUES (NULL, $1, '1', $2, 'LEGACY_MIGRATION', NOW(), $3)
         RETURNING id;`,
        [studentZeroId, item.settlement, item.access]
      );
      enrollmentId = enrRes.rows[0].id;
    }

    const result = await LearningProgressService.isStudentEligibleForCourse(studentZeroId, 1);
    assert(
      result === item.expected,
      `State [${item.label}] => ${item.expected ? 'ELIGIBLE' : 'INELIGIBLE'} (got ${result})`
    );

    if (enrollmentId) await db.query('DELETE FROM commerce.enrollments WHERE id = $1;', [enrollmentId]);
  }

  // Re-apply original check constraints and foreign keys
  await db.query(`
    ALTER TABLE commerce.enrollments ADD CONSTRAINT chk_enrollment_source_status CHECK (
      (enrollment_source IN ('COMMERCE_ORDER', 'INTERNAL_FREE_GRANT') AND settlement_status = 'SETTLED' AND order_id IS NOT NULL)
      OR (enrollment_source = 'LEGACY_MIGRATION' AND settlement_status = 'UNVERIFIED_HISTORICAL')
      OR (enrollment_source = 'MANUAL_REVIEW_QUARANTINE' AND settlement_status = 'UNVERIFIED_HISTORICAL')
    );
  `);
  await db.query(`
    ALTER TABLE commerce.enrollments ADD CONSTRAINT fk_enrollment_payment_settlement 
    FOREIGN KEY (order_id, settlement_status) REFERENCES commerce.payments(order_id, settlement_status) ON DELETE RESTRICT;
  `);

  // --- PART 3: PRIVATE DOCUMENT STORAGE INVENTORY & VERIFICATION ---
  console.log('\n--- 3. Private Document Storage Inventory & File Checks ---');
  const privateDocDir = path.join(process.cwd(), 'storage', 'documents');
  assert(fs.existsSync(privateDocDir), 'Private storage directory storage/documents exists outside web root');

  const requiredPdfs = [
    'physics-mechanics-formula-sheet.pdf',
    'chemistry-atomic-structure-mindmap.pdf',
    'math-calculus-super-tricks.pdf',
  ];

  for (const pdfName of requiredPdfs) {
    const fullPath = path.join(privateDocDir, pdfName);
    assert(fs.existsSync(fullPath), `Private document ${pdfName} exists`);
    const buf = fs.readFileSync(fullPath);
    assert(buf.length > 0, `File ${pdfName} has non-zero size (${buf.length} bytes)`);
    assert(buf.subarray(0, 5).toString('utf8') === '%PDF-', `File ${pdfName} has valid %PDF- magic signature`);
  }

  // Verify no document files exist in public web root
  const publicDocDir = path.join(process.cwd(), 'frontend', 'public', 'documents');
  assert(!fs.existsSync(publicDocDir), 'frontend/public/documents does NOT exist (no public static leak)');

  // --- PART 4: SEED AUTHENTIC ENROLLMENTS FOR STUDENT A & B ---
  console.log('\n--- 4. Seeding Settled Enrollments for HTTP QA ---');
  // Student A: Enrolled in Course 1 ONLY (ACTIVE)
  const orderA1 = crypto.randomUUID();
  const paymentA1 = crypto.randomUUID();
  await db.query(
    `INSERT INTO commerce.orders (id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount, billing_full_name, billing_email, billing_state_code, status)
     VALUES ($1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Student A', 'test.student@10qchallenge.in', 'KA', 'PAID');`,
    [orderA1, `ORD-A1-${Date.now()}`, studentAId]
  );
  await db.query(
    `INSERT INTO commerce.payments (id, order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status, settled_at)
     VALUES ($1, $2, 'PAYU', $3, 4999.00, 'INR', 'SETTLED', NOW());`,
    [paymentA1, orderA1, `PAYU-A1-${Date.now()}`]
  );
  const enrollResA = await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE')
     RETURNING id;`,
    [orderA1, studentAId]
  );
  const studentAEnrollmentId = enrollResA.rows[0].id;

  // Student B: Enrolled in Course 2 ONLY (PROVISIONED)
  const orderB2 = crypto.randomUUID();
  const paymentB2 = crypto.randomUUID();
  await db.query(
    `INSERT INTO commerce.orders (id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount, billing_full_name, billing_email, billing_state_code, status)
     VALUES ($1, $2, $3, '2', 4999.00, 0.00, 4999.00, 'Student B', 'student.isolation.test@example.com', 'DL', 'PAID');`,
    [orderB2, `ORD-B2-${Date.now()}`, studentBId]
  );
  await db.query(
    `INSERT INTO commerce.payments (id, order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status, settled_at)
     VALUES ($1, $2, 'PAYU', $3, 4999.00, 'INR', 'SETTLED', NOW());`,
    [paymentB2, orderB2, `PAYU-B2-${Date.now()}`]
  );
  await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '2', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'PROVISIONED');`,
    [orderB2, studentBId]
  );

  // Student Zero: 0 enrollments
  await closeCommerceDb();
  console.log('  ✓ Settled enrollments seeded: Student A -> Course 1, Student B -> Course 2, Student Zero -> None');

  // --- PART 5: PRODUCTION SERVER LAUNCH ---
  console.log('\n--- 5. Production Server Launch ---');
  const BASE_URL = 'http://localhost:3000';
  let serverProcess = null;

  console.log('  Starting server via node server.js...');
  serverProcess = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let isReady = false;
  for (let i = 0; i < 30; i++) {
    await wait(500);
    const check = await probeUrl(`${BASE_URL}/`);
    if (check.status === 200) {
      isReady = true;
      console.log(`  ✓ Server reachable on attempt ${i + 1}`);
      break;
    }
  }

  if (!isReady) {
    console.error('  ✗ Timed out waiting for server to start.');
    if (serverProcess) serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  try {
    // --- PART 6: AUTHENTICATING TEST SESSIONS ---
    console.log('\n--- 6. Authenticating Test Sessions ---');
    const loginARes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(loginARes.status === 200, 'Student A logged in successfully');
    const cookieA = getCookieHeader(loginARes);

    const loginBRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(loginBRes.status === 200, 'Student B logged in successfully');
    const cookieB = getCookieHeader(loginBRes);

    const loginZeroRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.zero.enrollment@example.com', password: 'StudentPass2026!' }),
    });
    assert(loginZeroRes.status === 200, 'Student Zero logged in successfully');
    const cookieZero = getCookieHeader(loginZeroRes);

    // --- PART 7: UNAUTHENTICATED REQUESTS (401) ---
    console.log('\n--- 7. Unauthenticated Request Access Control ---');
    const unauthVideoRes = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/1`);
    assert(unauthVideoRes.status === 401, 'Unauthenticated video request returns HTTP 401');

    const unauthDocRes = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/1`);
    assert(unauthDocRes.status === 401, 'Unauthenticated document request returns HTTP 401');

    // --- PART 8: AUTHORIZED VIMEO VIDEO ACCESS (200) ---
    console.log('\n--- 8. Authorized Vimeo Video Access & Configuration ---');
    const videoRes = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/1`, {
      headers: { Cookie: cookieA },
    });
    assert(videoRes.status === 200, 'Student A receives HTTP 200 for Video #1');
    assert(videoRes.json?.success === true, 'Video response success is true');
    assert(videoRes.json?.data?.videoId === 1, 'Video data videoId is 1');
    assert(videoRes.json?.data?.courseId === 1, 'Video data courseId is 1');
    assert(videoRes.json?.data?.title === 'Mechanics & 1D Kinematics - Complete Masterclass', 'Video title matches');
    assert(Boolean(videoRes.json?.data?.playbackConfig), 'Playback configuration object present');
    assert(videoRes.json?.data?.playbackConfig?.provider === 'vimeo', 'Provider is vimeo');
    assert(videoRes.json?.data?.playbackConfig?.vimeoVideoId === '824804225', 'Vimeo video ID is 824804225');
    assert(videoRes.json?.data?.playbackConfig?.responsive === true, 'Responsive option is true');
    assert(videoRes.json?.data?.playbackConfig?.dnt === true, 'Do Not Track option is true');
    assert(videoRes.json?.data?.playbackConfig?.color === '3F328A', 'Brand player color is 3F328A');

    // Video 2 (Course 1)
    const video2Res = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/2`, {
      headers: { Cookie: cookieA },
    });
    assert(video2Res.status === 200, 'Student A receives HTTP 200 for Video #2');
    assert(video2Res.json?.data?.videoId === 2, 'Video #2 videoId is 2');
    assert(video2Res.json?.data?.playbackConfig?.vimeoVideoId === '824804226', 'Video #2 Vimeo ID is 824804226');

    // --- PART 9: AUTHORIZED PDF DOCUMENT STREAMING (200) ---
    console.log('\n--- 9. Authorized PDF Document Streaming & Header Verification ---');
    const docRes = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/1`, {
      headers: { Cookie: cookieA },
    });
    assert(docRes.status === 200, 'Student A receives HTTP 200 for Document #1');
    assert(docRes.headers['content-type'] === 'application/pdf', 'Header Content-Type is application/pdf');
    assert(docRes.headers['content-disposition']?.startsWith('inline'), 'Header Content-Disposition starts with inline');
    assert(docRes.headers['cache-control']?.includes('private'), 'Header Cache-Control contains private');
    assert(docRes.headers['cache-control']?.includes('no-store'), 'Header Cache-Control contains no-store');
    assert(docRes.headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options is nosniff');
    assert(
      Boolean(docRes.headers['content-length']) || docRes.headers['transfer-encoding'] === 'chunked',
      'Streaming transfer header present (content-length or chunked transfer-encoding)'
    );
    assert(docRes.buffer.length > 0, `Received non-empty PDF bytes (${docRes.buffer.length} bytes)`);
    assert(docRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Streamed content begins with valid %PDF- header');

    // Document 2 (Physical Chemistry, Course 1)
    const doc2Res = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/2`, {
      headers: { Cookie: cookieA },
    });
    assert(doc2Res.status === 200, 'Student A receives HTTP 200 for Document #2');
    assert(doc2Res.headers['content-type'] === 'application/pdf', 'Doc #2 Content-Type is application/pdf');
    assert(doc2Res.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Doc #2 begins with %PDF-');

    // Document 3 (Calculus, Course 1)
    const doc3Res = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/3`, {
      headers: { Cookie: cookieA },
    });
    assert(doc3Res.status === 200, 'Student A receives HTTP 200 for Document #3');
    assert(doc3Res.headers['content-type'] === 'application/pdf', 'Doc #3 Content-Type is application/pdf');
    assert(doc3Res.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Doc #3 begins with %PDF-');

    // --- PART 10: CROSS-COURSE & CROSS-STUDENT ISOLATION ---
    console.log('\n--- 10. Cross-Course & Multi-Tenant Access Control ---');

    // Student A (enrolled in Course 1) attempts to access Video #3 (belongs to Course 2)
    const aVideo3InCourse1 = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/3`, {
      headers: { Cookie: cookieA },
    });
    assert(aVideo3InCourse1.status === 403, 'Student A cannot access Course 2 video under Course 1 hierarchy (403)');
    assert(aVideo3InCourse1.json?.error.includes('Hierarchy mismatch'), 'Returns explicit hierarchy mismatch error');

    // Student A attempts to access Course 2 directly
    const aVideoInCourse2 = await probeUrl(`${BASE_URL}/api/student/classroom/2/video/3`, {
      headers: { Cookie: cookieA },
    });
    assert(aVideoInCourse2.status === 403, 'Student A cannot access non-enrolled Course 2 video (403)');
    assert(aVideoInCourse2.json?.error.includes('Forbidden'), 'Returns enrollment Forbidden error');

    const aDocInCourse2 = await probeUrl(`${BASE_URL}/api/student/classroom/2/document/1`, {
      headers: { Cookie: cookieA },
    });
    assert(aDocInCourse2.status === 403, 'Student A cannot access non-enrolled Course 2 document (403)');

    // Student B (enrolled in Course 2) attempts to access Course 1
    const bVideoInCourse1 = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/1`, {
      headers: { Cookie: cookieB },
    });
    assert(bVideoInCourse1.status === 403, 'Student B cannot access non-enrolled Course 1 video (403)');

    const bDocInCourse1 = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/1`, {
      headers: { Cookie: cookieB },
    });
    assert(bDocInCourse1.status === 403, 'Student B cannot access non-enrolled Course 1 document (403)');

    // Student B accesses enrolled Course 2 Video #3 -> 200 OK
    const bVideo3InCourse2 = await probeUrl(`${BASE_URL}/api/student/classroom/2/video/3`, {
      headers: { Cookie: cookieB },
    });
    assert(bVideo3InCourse2.status === 200, 'Student B successfully accesses enrolled Course 2 Video #3 (200)');
    assert(bVideo3InCourse2.json?.data?.playbackConfig?.vimeoVideoId === '824804227', 'Student B receives Vimeo ID 824804227');

    // Student Zero (No enrollment) attempts access
    const zeroVideo = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/1`, {
      headers: { Cookie: cookieZero },
    });
    assert(zeroVideo.status === 403, 'Student Zero cannot access video (403)');

    const zeroDoc = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/1`, {
      headers: { Cookie: cookieZero },
    });
    assert(zeroDoc.status === 403, 'Student Zero cannot access document (403)');

    // --- PART 11: PARAMETER VALIDATION & BOUNDARY CONDITIONS ---
    console.log('\n--- 11. Parameter Validation & Edge Cases ---');

    // Invalid course IDs
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/0/video/1`, { headers: { Cookie: cookieA } })).status === 400, 'Video Course ID 0 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/-1/video/1`, { headers: { Cookie: cookieA } })).status === 400, 'Video Course ID -1 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/abc/video/1`, { headers: { Cookie: cookieA } })).status === 400, 'Video Course ID abc returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/9999/video/1`, { headers: { Cookie: cookieA } })).status === 404, 'Video Course ID 9999 returns 404');

    assert((await probeUrl(`${BASE_URL}/api/student/classroom/0/document/1`, { headers: { Cookie: cookieA } })).status === 400, 'Doc Course ID 0 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/-1/document/1`, { headers: { Cookie: cookieA } })).status === 400, 'Doc Course ID -1 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/abc/document/1`, { headers: { Cookie: cookieA } })).status === 400, 'Doc Course ID abc returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/9999/document/1`, { headers: { Cookie: cookieA } })).status === 404, 'Doc Course ID 9999 returns 404');

    // Invalid video IDs
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/video/0`, { headers: { Cookie: cookieA } })).status === 400, 'Video ID 0 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/video/-2`, { headers: { Cookie: cookieA } })).status === 400, 'Video ID -2 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/video/abc`, { headers: { Cookie: cookieA } })).status === 400, 'Video ID abc returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/video/9999`, { headers: { Cookie: cookieA } })).status === 404, 'Non-existent Video ID 9999 returns 404');

    // Invalid document IDs
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/document/0`, { headers: { Cookie: cookieA } })).status === 400, 'Doc ID 0 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/document/-2`, { headers: { Cookie: cookieA } })).status === 400, 'Doc ID -2 returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/document/abc`, { headers: { Cookie: cookieA } })).status === 400, 'Doc ID abc returns 400');
    assert((await probeUrl(`${BASE_URL}/api/student/classroom/1/document/9999`, { headers: { Cookie: cookieA } })).status === 404, 'Non-existent Doc ID 9999 returns 404');

    // Anti-IDOR: Spoofed userId query parameter ignored
    const videoIdor = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/1?userId=${studentBId}`, {
      headers: { Cookie: cookieA },
    });
    assert(videoIdor.status === 200, 'Video request with spoofed userId param succeeds without honoring spoof');

    const docIdor = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/1?userId=${studentBId}`, {
      headers: { Cookie: cookieA },
    });
    assert(docIdor.status === 200, 'Doc request with spoofed userId param succeeds without honoring spoof');

    // --- PART 12: PATH TRAVERSAL & SECURITY BOUNDARIES ---
    console.log('\n--- 12. Path Traversal & Security Boundary Testing ---');
    const traversalDoc1 = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/..%2f..%2fpackage.json`, {
      headers: { Cookie: cookieA },
    });
    assert(traversalDoc1.status === 400 || traversalDoc1.status === 404, 'Path traversal attempt rejected with 400/404');

    // Direct unit validation of storage resolver
    const { resolvePrivatePdfFile } = require('../frontend/lib/documents/storage.js');
    const traversalAttempt1 = resolvePrivatePdfFile('../../package.json');
    assert(traversalAttempt1.success === false, 'Storage resolver rejects ../../package.json');
    assert(traversalAttempt1.error?.includes('traversal') || traversalAttempt1.error?.includes('PDF'), 'Reason states traversal/extension');

    const traversalAttempt2 = resolvePrivatePdfFile('....//....//sensitive.pdf');
    assert(traversalAttempt2.success === false, 'Storage resolver rejects traversal sequence in PDF name');

    const nonPdfAttempt = resolvePrivatePdfFile('secret.env');
    assert(nonPdfAttempt.success === false, 'Storage resolver rejects non-PDF file');

    const nullByteAttempt = resolvePrivatePdfFile('valid.pdf\0.exe');
    assert(nullByteAttempt.success === false, 'Storage resolver rejects null byte injection');

    // --- PART 13: DYNAMIC ENROLLMENT REVOCATION ENFORCEMENT ---
    console.log('\n--- 13. Dynamic Enrollment Revocation Enforcement ---');

    // 13.1 Stop server to flush in-process PGlite memory cache
    serverProcess.kill('SIGTERM');
    await wait(600);

    // 13.2 Update Student A enrollment to REVOKED in PostgreSQL
    db = await getCommerceDb();
    await db.query(
      `UPDATE commerce.enrollments SET access_state = 'REVOKED' WHERE id = $1;`,
      [studentAEnrollmentId]
    );
    await closeCommerceDb();
    console.log('  ✓ Updated Student A enrollment access_state to REVOKED in PostgreSQL');

    // 13.3 Restart server with updated database state
    serverProcess = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let restartedReady = false;
    for (let i = 0; i < 30; i++) {
      await wait(400);
      const check = await probeUrl(`${BASE_URL}/`);
      if (check.status === 200) {
        restartedReady = true;
        break;
      }
    }
    assert(restartedReady, 'Server restarted successfully with revoked enrollment state');

    // 13.4 Verify immediate subsequent video request is DENIED (HTTP 403)
    const revokedVideoRes = await probeUrl(`${BASE_URL}/api/student/classroom/1/video/1`, {
      headers: { Cookie: cookieA },
    });
    assert(revokedVideoRes.status === 403, 'Subsequent video request is immediately denied with HTTP 403');
    assert(revokedVideoRes.json?.error.includes('Forbidden'), 'Revocation response explicitly mentions Forbidden');

    // 13.5 Verify immediate subsequent document request is DENIED (HTTP 403)
    const revokedDocRes = await probeUrl(`${BASE_URL}/api/student/classroom/1/document/1`, {
      headers: { Cookie: cookieA },
    });
    assert(revokedDocRes.status === 403, 'Subsequent document request is immediately denied with HTTP 403');
    assert(revokedDocRes.json?.error.includes('Forbidden'), 'Revocation response explicitly mentions Forbidden');
    assert(revokedDocRes.buffer.length < 500 && !revokedDocRes.text.includes('%PDF-'), 'Zero PDF bytes delivered after revocation');

    // 13.6 Restore Student A enrollment to ACTIVE
    serverProcess.kill('SIGTERM');
    await wait(600);

    db = await getCommerceDb();
    await db.query(
      `UPDATE commerce.enrollments SET access_state = 'ACTIVE' WHERE id = $1;`,
      [studentAEnrollmentId]
    );
    await closeCommerceDb();

    serverProcess = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    for (let i = 0; i < 30; i++) {
      await wait(400);
      const check = await probeUrl(`${BASE_URL}/`);
      if (check.status === 200) break;
    }

    // --- PART 14: SENSITIVE DATA REDACTION AUDIT ---
    console.log('\n--- 14. Sensitive Data Redaction Audit ---');
    const forbiddenKeys = ['filePath', 'fileUrl', 'vimeoPrivateKey', 'client_secret', 'secret', 'accessToken'];
    const videoViolations = checkForForbiddenKeys(videoRes.json, forbiddenKeys);
    assert(videoViolations.length === 0, 'Video response strictly omits secrets or internal file paths', videoViolations.join('; '));

    const videoText = videoRes.text;
    assert(!videoText.includes('vimeo_private'), 'Video response does not contain vimeo_private');
    assert(!videoText.includes('client_secret'), 'Video response does not contain client_secret');

    // Document response header inspection
    const docHeaders = docRes.headers;
    assert(!JSON.stringify(docHeaders).includes('D:\\'), 'Doc response headers do not leak Windows filesystem paths');
    assert(!JSON.stringify(docHeaders).includes('/storage/documents'), 'Doc response headers do not leak server storage path');

    // --- PART 15: POLICY GUARD (MY COURSES LOCKED) ---
    console.log('\n--- 15. Policy Guard (My Courses classroomAccessEligible remains false) ---');
    const myCoursesRes = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: cookieA },
    });
    assert(myCoursesRes.status === 200, 'My Courses API returns HTTP 200');
    const enrolledCourses = myCoursesRes.json?.data?.courses || [];
    assert(enrolledCourses.length > 0, `Student A has ${enrolledCourses.length} enrolled courses`);
    for (const c of enrolledCourses) {
      assert(
        c.classroomAccessEligible === false,
        `Course #${c.courseId} classroomAccessEligible is strictly false`
      );
      assert(
        Boolean(c.classroomStatusNotice),
        `Course #${c.courseId} retains classroomStatusNotice`
      );
    }

    // Clean test tables
    db = await getCommerceDb();
    await db.query('DELETE FROM commerce.enrollments WHERE user_id = ANY($1);', [allUserIds]);
    await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
    await db.query('DELETE FROM commerce.orders WHERE user_id = ANY($1);', [allUserIds]);
    await closeCommerceDb();
    console.log('  ✓ Cleaned up test fixture records');

  } finally {
    if (serverProcess) {
      console.log('\n--- Terminating Production Server ---');
      serverProcess.kill('SIGTERM');
      await wait(500);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.5 STAGE 3 QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage3Tests().catch((err) => {
  console.error('[Stage 3 Test Suite Fatal Error]', err);
  process.exit(1);
});
