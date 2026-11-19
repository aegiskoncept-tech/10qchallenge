// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.5 STAGE 2 AUTOMATED TEST SUITE
// Secure Classroom Authorization, Academic Hierarchy & Content APIs
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

function getCsrfToken(cookieHeader) {
  const match = cookieHeader.match(/10q_csrf_token=([^;]+)/);
  return match ? match[1] : '';
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
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            latency: Date.now() - startTime,
            json,
            text: body,
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
      if (value.startsWith('/documents/') || value.includes('private_key') || value.includes('secret')) {
        violations.push(`${currentPath} contains sensitive value substring: "${value}"`);
      }
    }
    if (typeof value === 'object' && value !== null) {
      violations.push(...checkForForbiddenKeys(value, forbiddenKeys, currentPath));
    }
  }
  return violations;
}

async function runStage2Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.5 STAGE 2 TEST SUITE');
  console.log('Secure Classroom Authorization, Content Delivery & Media Sanitization');
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

  // Temporarily adjust check constraint and foreign key to allow testing synthetic non-settled rows
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

    // Clean this test state row
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

  // --- PART 3: SERVICE-LAYER ACADEMIC HIERARCHY & CONTENT INTEGRITY ---
  console.log('\n--- 3. Service-Layer Classroom Curriculum Assembly ---');
  const curriculumDirect = await LearningProgressService.getClassroomCurriculum(studentAId, 1);
  assert(curriculumDirect.courseId === 1, 'Curriculum courseId is 1');
  assert(Boolean(curriculumDirect.courseTitle), `Curriculum courseTitle is "${curriculumDirect.courseTitle}"`);
  assert(Array.isArray(curriculumDirect.subjects) && curriculumDirect.subjects.length > 0, 'Curriculum includes subjects');
  assert(curriculumDirect.progress.totalTopics > 0, `Curriculum reports ${curriculumDirect.progress.totalTopics} total topics`);
  assert(curriculumDirect.progress.completedTopics === 0, 'Curriculum reports 0 completed topics initially');
  assert(curriculumDirect.progress.completionPercentage === 0.0, 'Curriculum reports 0.0% completion initially');

  // Verify subject -> chapters -> topics / videos / docs structure
  const physicsSubject = curriculumDirect.subjects.find((s) => s.subjectName.toLowerCase().includes('physics'));
  assert(Boolean(physicsSubject), 'Physics subject present in Course 1');
  const mechChapter = physicsSubject?.chapters.find((ch) => ch.chapterName.toLowerCase().includes('mechanics'));
  assert(Boolean(mechChapter), 'Mechanics & Kinematics chapter present in Physics');
  assert(Array.isArray(mechChapter?.topics) && mechChapter.topics.length > 0, 'Mechanics chapter has topics');
  assert(Array.isArray(mechChapter?.videos) && mechChapter.videos.length > 0, 'Mechanics chapter has attached video(s)');
  assert(Array.isArray(mechChapter?.documents) && mechChapter.documents.length > 0, 'Mechanics chapter has attached document(s)');

  // Verify video metadata
  const sampleVideo = mechChapter.videos[0];
  assert(Boolean(sampleVideo.id), `Video ID present: ${sampleVideo.id}`);
  assert(Boolean(sampleVideo.title), `Video title present: "${sampleVideo.title}"`);
  assert(Boolean(sampleVideo.vimeoVideoId), `Vimeo video ID present: "${sampleVideo.vimeoVideoId}"`);
  assert(typeof sampleVideo.durationMinutes === 'number', `Video duration: ${sampleVideo.durationMinutes} mins`);
  assert(sampleVideo.status === 'NOT_STARTED', 'Video initial status is NOT_STARTED');
  assert(sampleVideo.completedAt === null, 'Video initial completedAt is null');

  // Verify document metadata
  const sampleDoc = mechChapter.documents[0];
  assert(Boolean(sampleDoc.id), `Document ID present: ${sampleDoc.id}`);
  assert(Boolean(sampleDoc.title), `Document title present: "${sampleDoc.title}"`);
  assert(Boolean(sampleDoc.fileType), `Document file type present: "${sampleDoc.fileType}"`);
  assert(Boolean(sampleDoc.fileSizeBytes), `Document file size: "${sampleDoc.fileSizeBytes}"`);
  assert(sampleDoc.status === 'NOT_STARTED', 'Document initial status is NOT_STARTED');
  assert(sampleDoc.completedAt === null, 'Document initial completedAt is null');

  // Verify media sanitization on direct curriculum
  const forbiddenKeys = ['filePath', 'fileUrl', 'vimeoPrivateKey', 'client_secret', 'secret'];
  const directViolations = checkForForbiddenKeys(curriculumDirect, forbiddenKeys);
  assert(directViolations.length === 0, 'Service curriculum strictly omits internal file paths and secrets', directViolations.join('; '));

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
  await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE');`,
    [orderA1, studentAId]
  );

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

  // --- PART 5: PRODUCTION SERVER INITIALIZATION ---
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
    const csrfA = getCsrfToken(cookieA);

    const loginBRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(loginBRes.status === 200, 'Student B logged in successfully');
    const cookieB = getCookieHeader(loginBRes);
    const csrfB = getCsrfToken(cookieB);

    const loginZeroRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.zero.enrollment@example.com', password: 'StudentPass2026!' }),
    });
    assert(loginZeroRes.status === 200, 'Student Zero logged in successfully');
    const cookieZero = getCookieHeader(loginZeroRes);
    const csrfZero = getCsrfToken(cookieZero);

    // --- PART 7: UNAUTHENTICATED REQUESTS (401) ---
    console.log('\n--- 7. Unauthenticated Access Control ---');
    const unauthRes = await probeUrl(`${BASE_URL}/api/student/classroom/1`);
    assert(unauthRes.status === 401, 'Unauthenticated request returns HTTP 401 Unauthorized');
    assert(unauthRes.json?.authenticated === false || unauthRes.json?.success === false, '401 response communicates authentication failure');

    // --- PART 8: MULTI-TENANT ISOLATION & ENROLLMENT AUTHORIZATION ---
    console.log('\n--- 8. Multi-Tenant Cross-Student & Cross-Course Isolation ---');

    // Student A on enrolled Course 1 -> 200 OK
    const aInCourse1 = await probeUrl(`${BASE_URL}/api/student/classroom/1`, {
      headers: { Cookie: cookieA },
    });
    assert(aInCourse1.status === 200, 'Student A receives HTTP 200 for enrolled Course 1');
    assert(aInCourse1.json?.success === true, 'Response success is true');
    assert(aInCourse1.json?.data?.courseId === 1, 'Response data courseId is 1');

    // Student A on non-enrolled Course 2 -> 403 Forbidden
    const aInCourse2 = await probeUrl(`${BASE_URL}/api/student/classroom/2`, {
      headers: { Cookie: cookieA },
    });
    assert(aInCourse2.status === 403, 'Student A receives HTTP 403 Forbidden for non-enrolled Course 2');
    assert(aInCourse2.json?.success === false, 'Cross-course response success is false');
    assert(aInCourse2.json?.error.includes('Forbidden'), 'Error explicitly mentions Forbidden');

    // Student B on enrolled Course 2 -> 200 OK
    const bInCourse2 = await probeUrl(`${BASE_URL}/api/student/classroom/2`, {
      headers: { Cookie: cookieB },
    });
    assert(bInCourse2.status === 200, 'Student B receives HTTP 200 for enrolled Course 2');
    assert(bInCourse2.json?.data?.courseId === 2, 'Student B response data courseId is 2');

    // Student B on non-enrolled Course 1 -> 403 Forbidden
    const bInCourse1 = await probeUrl(`${BASE_URL}/api/student/classroom/1`, {
      headers: { Cookie: cookieB },
    });
    assert(bInCourse1.status === 403, 'Student B receives HTTP 403 Forbidden for non-enrolled Course 1');

    // Student Zero (No Enrollments) on Course 1 -> 403 Forbidden
    const zeroInCourse1 = await probeUrl(`${BASE_URL}/api/student/classroom/1`, {
      headers: { Cookie: cookieZero },
    });
    assert(zeroInCourse1.status === 403, 'Student Zero receives HTTP 403 Forbidden for Course 1');

    // --- PART 9: PARAMETER VALIDATION & BOUNDARY CONDITIONS ---
    console.log('\n--- 9. Parameter Validation & Edge-Case Boundaries ---');

    // Course ID 0
    const resZeroCourse = await probeUrl(`${BASE_URL}/api/student/classroom/0`, {
      headers: { Cookie: cookieA },
    });
    assert(resZeroCourse.status === 400, 'Course ID 0 returns HTTP 400 Bad Request');

    // Negative Course ID
    const resNegCourse = await probeUrl(`${BASE_URL}/api/student/classroom/-5`, {
      headers: { Cookie: cookieA },
    });
    assert(resNegCourse.status === 400, 'Negative Course ID returns HTTP 400 Bad Request');

    // Non-numeric Course ID
    const resAlphaCourse = await probeUrl(`${BASE_URL}/api/student/classroom/invalid-id`, {
      headers: { Cookie: cookieA },
    });
    assert(resAlphaCourse.status === 400, 'Non-numeric Course ID returns HTTP 400 Bad Request');

    // Non-existent Course ID (9999)
    const resNotFoundCourse = await probeUrl(`${BASE_URL}/api/student/classroom/9999`, {
      headers: { Cookie: cookieA },
    });
    assert(resNotFoundCourse.status === 404, 'Non-existent Course ID 9999 returns HTTP 404 Not Found');

    // Anti-IDOR: Student A attempts to pass ?userId=35 (Student B's ID)
    const resIdor = await probeUrl(`${BASE_URL}/api/student/classroom/1?userId=${studentBId}`, {
      headers: { Cookie: cookieA },
    });
    assert(resIdor.status === 200, 'Student A query with spoofed userId param succeeds without honoring spoof');
    assert(resIdor.json?.data?.courseId === 1, 'Data is strictly Course 1 for authenticated Student A');

    // --- PART 10: COMPLETE ACADEMIC HIERARCHY & MEDIA METADATA ---
    console.log('\n--- 10. Complete Academic Hierarchy & Content Delivery Verification ---');
    const classroomData = aInCourse1.json?.data;
    assert(Boolean(classroomData.courseTitle), `Course Title: "${classroomData.courseTitle}"`);
    assert(Boolean(classroomData.courseSlug), `Course Slug: "${classroomData.courseSlug}"`);
    assert(Array.isArray(classroomData.subjects), 'Subjects array is present');
    assert(classroomData.subjects.length >= 3, `Course 1 has ${classroomData.subjects.length} subjects (Physics, Chemistry, Math)`);

    let totalVerifiedTopics = 0;
    let totalVerifiedVideos = 0;
    let totalVerifiedDocs = 0;

    for (const subj of classroomData.subjects) {
      assert(Boolean(subj.subjectId), `Subject #${subj.subjectId} has valid ID`);
      assert(Boolean(subj.subjectName), `Subject Name: "${subj.subjectName}"`);
      assert(Array.isArray(subj.chapters) && subj.chapters.length > 0, `Subject "${subj.subjectName}" has chapters`);

      for (const ch of subj.chapters) {
        assert(Boolean(ch.chapterId), `Chapter #${ch.chapterId} has valid ID`);
        assert(Boolean(ch.chapterName), `Chapter Name: "${ch.chapterName}"`);
        assert(Array.isArray(ch.topics), `Chapter "${ch.chapterName}" has topics array`);
        assert(Array.isArray(ch.videos), `Chapter "${ch.chapterName}" has videos array`);
        assert(Array.isArray(ch.documents), `Chapter "${ch.chapterName}" has documents array`);

        totalVerifiedTopics += ch.topics.length;
        totalVerifiedVideos += ch.videos.length;
        totalVerifiedDocs += ch.documents.length;

        // Verify topic items
        for (const t of ch.topics) {
          assert(typeof t.topicId === 'number' && t.topicId > 0, `Topic #${t.topicId} has numeric ID`);
          assert(Boolean(t.topicName), `Topic Name: "${t.topicName}"`);
          assert(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(t.status), `Topic status valid: ${t.status}`);
        }

        // Verify video items
        for (const v of ch.videos) {
          assert(typeof v.id === 'number', `Video #${v.id} has numeric ID`);
          assert(Boolean(v.title), `Video Title: "${v.title}"`);
          assert(Boolean(v.vimeoVideoId), `Vimeo Video ID: "${v.vimeoVideoId}"`);
          assert(typeof v.durationMinutes === 'number', `Video duration: ${v.durationMinutes}`);
          assert(typeof v.isFreePreview === 'boolean', `Video isFreePreview: ${v.isFreePreview}`);
          assert(typeof v.displayOrder === 'number', `Video displayOrder: ${v.displayOrder}`);
          assert(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(v.status), `Video status: ${v.status}`);
        }

        // Verify document items
        for (const d of ch.documents) {
          assert(typeof d.id === 'number', `Document #${d.id} has numeric ID`);
          assert(Boolean(d.title), `Document Title: "${d.title}"`);
          assert(Boolean(d.fileType), `Document File Type: "${d.fileType}"`);
          assert(typeof d.displayOrder === 'number', `Document displayOrder: ${d.displayOrder}`);
          assert(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(d.status), `Document status: ${d.status}`);
        }
      }
    }

    assert(totalVerifiedTopics > 0, `Verified ${totalVerifiedTopics} topics across hierarchy`);
    assert(totalVerifiedVideos > 0, `Verified ${totalVerifiedVideos} videos across hierarchy`);
    assert(totalVerifiedDocs > 0, `Verified ${totalVerifiedDocs} documents across hierarchy`);

    // --- PART 11: DYNAMIC GENUINE PROGRESS INTEGRATION ---
    console.log('\n--- 11. Dynamic Genuine Student Progress Integration ---');

    // 11.1 Verify initial unstarted progress
    assert(classroomData.progress.completedTopics === 0, 'Initial completed topics is 0');
    assert(classroomData.progress.completionPercentage === 0.0, 'Initial completion percentage is 0.0%');

    // 11.2 Mark Topic 1 as COMPLETED for Student A via official progress API
    const markTopicRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfA,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        courseId: 1,
        topicId: 1,
        status: 'COMPLETED',
      }),
    });
    assert(markTopicRes.status === 200, 'Mark Topic 1 COMPLETED returned HTTP 200');

    // 11.3 Mark Video 1 as COMPLETED for Student A via official content progress API
    const markVideoRes = await probeUrl(`${BASE_URL}/api/student/progress/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfA,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        courseId: 1,
        contentType: 'VIDEO',
        contentIdentifier: '824804225',
        status: 'COMPLETED',
      }),
    });
    assert(markVideoRes.status === 200, 'Mark Video 1 COMPLETED returned HTTP 200');

    // 11.4 Re-fetch Classroom API for Student A and verify updated progress
    const updatedClassroomRes = await probeUrl(`${BASE_URL}/api/student/classroom/1`, {
      headers: { Cookie: cookieA },
    });
    assert(updatedClassroomRes.status === 200, 'Re-fetched Classroom API returns HTTP 200');
    const updatedData = updatedClassroomRes.json?.data;

    assert(updatedData.progress.completedTopics === 1, `Completed topics updated to 1 (got ${updatedData.progress.completedTopics})`);
    assert(updatedData.progress.completionPercentage > 0, `Completion percentage is positive: ${updatedData.progress.completionPercentage}%`);
    assert(updatedData.progress.completedVideos === 1, `Completed videos updated to 1 (got ${updatedData.progress.completedVideos})`);

    // Find Topic 1 in updated hierarchy
    const updatedPhysics = updatedData.subjects.find((s) => s.subjectName.toLowerCase().includes('physics'));
    const updatedMech = updatedPhysics?.chapters.find((ch) => ch.chapterName.toLowerCase().includes('mechanics'));
    const updatedTopic1 = updatedMech?.topics.find((t) => t.topicId === 1);
    const updatedTopic2 = updatedMech?.topics.find((t) => t.topicId === 2);

    assert(updatedTopic1?.status === 'COMPLETED', `Topic 1 status is COMPLETED (got ${updatedTopic1?.status})`);
    assert(Boolean(updatedTopic1?.completedAt), `Topic 1 completedAt timestamp: "${updatedTopic1?.completedAt}"`);
    assert(updatedTopic2?.status === 'NOT_STARTED', `Topic 2 remains NOT_STARTED (got ${updatedTopic2?.status})`);

    // Find Video 1 in updated hierarchy
    const updatedVideo1 = updatedMech?.videos.find((v) => v.id === 1 || v.vimeoVideoId === '824804225');
    assert(updatedVideo1?.status === 'COMPLETED', `Video 1 status is COMPLETED (got ${updatedVideo1?.status})`);
    assert(Boolean(updatedVideo1?.completedAt), `Video 1 completedAt timestamp: "${updatedVideo1?.completedAt}"`);

    // Verify last activity is populated
    assert(Boolean(updatedData.lastActivity), 'Classroom data reports active lastActivity location');
    assert(updatedData.lastActivity?.topicId === 1, `lastActivity topicId is 1 (got ${updatedData.lastActivity?.topicId})`);

    // --- PART 12: MEDIA & CREDENTIAL SANITIZATION AUDIT ---
    console.log('\n--- 12. Media & Credential Sanitization Audit ---');
    const httpViolations = checkForForbiddenKeys(updatedClassroomRes.json, forbiddenKeys);
    assert(httpViolations.length === 0, 'Classroom API response strictly omits sensitive keys and internal paths', httpViolations.join('; '));

    // Verify raw JSON text doesn't contain server file paths or secrets
    const rawText = updatedClassroomRes.text;
    assert(!rawText.includes('/documents/physics-mechanics-formula-sheet.pdf'), 'Raw response does not leak Document fileUrl');
    assert(!rawText.includes('private_key'), 'Raw response does not contain private_key');
    assert(!rawText.includes('client_secret'), 'Raw response does not contain client_secret');

    // --- PART 13: STRICT POLICY GUARD (MY COURSES LOCKED) ---
    console.log('\n--- 13. My Courses Policy Guard (classroomAccessEligible remains false) ---');
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

  } finally {
    if (serverProcess) {
      console.log('\n--- Terminating Production Server ---');
      serverProcess.kill('SIGTERM');
      await wait(500);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.5 STAGE 2 QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage2Tests().catch((err) => {
  console.error('[Stage 2 Test Suite Fatal Error]', err);
  process.exit(1);
});
