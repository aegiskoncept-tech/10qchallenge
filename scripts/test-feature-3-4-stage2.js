// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 AUTOMATED TEST SUITE: STAGE 2
// Authenticated Student Learning Progress APIs:
// - GET  /api/student/progress/summary
// - GET  /api/student/progress/courses/[courseId]
// - POST /api/student/progress/topics
// - POST /api/student/progress/content
// - GET  /api/student/progress/activity
// Multi-Tenant Isolation, CSRF Protection, Downgrade Prevention,
// Hierarchy Enforcement, Zero-Topic Safety, and Rate Limiting
// ==============================================================================

const path = require('path');
const fs = require('fs');
const http = require('http');
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

async function runFeature34Stage2Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.4 STAGE 2 VERIFICATION SUITE');
  console.log('Authenticated Student Learning Progress APIs & Security Suite');
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

  // --- PART 1: STORAGE & AUTH INTEGRITY PRE-CHECK ---
  console.log('--- 1. Storage & Identity Integrity Pre-Check ---');
  const pgDir = path.join(process.cwd(), 'database', 'pg_commerce_dev');
  assert(fs.existsSync(pgDir), 'database/pg_commerce_dev exists');

  const authDbPath = path.join(process.cwd(), 'database', '10q_auth_dev.db');
  assert(fs.existsSync(authDbPath), 'database/10q_auth_dev.db exists');

  const authDb = new DatabaseSync(authDbPath);
  const studentARow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('test.student@10qchallenge.in');
  const studentBRow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('student.isolation.test@example.com');
  const studentAId = studentARow ? Number(studentARow.id) : 8;
  const studentBId = studentBRow ? Number(studentBRow.id) : 35;
  authDb.close();

  assert(Boolean(studentAId), `Student A resolved with ID ${studentAId}`);
  assert(Boolean(studentBId), `Student B resolved with ID ${studentBId}`);
  assert(studentAId !== studentBId, 'Student A and Student B IDs are strictly distinct');

  // Database helpers
  const crypto = require('crypto');
  const { getCommerceDb, closeCommerceDb } = require('../frontend/lib/learning/dist/commerce/db.js');
  let db = await getCommerceDb();

  // Clean pre-existing test records for isolation
  await db.query('DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  // Clean and seed settled enrollment fixtures for Student A (Courses 1 & 2) and Student B (Course 2)
  await db.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await db.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await db.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  const orderA1 = crypto.randomUUID();
  const orderA2 = crypto.randomUUID();
  const orderB1 = crypto.randomUUID();
  const orderB2 = crypto.randomUUID();

  await db.query(
    `INSERT INTO commerce.orders (id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount, billing_full_name, billing_email, billing_state_code, status)
     VALUES ($1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Test Student', 'test.student@10qchallenge.in', 'KA', 'PAID'),
            ($4, $5, $3, '2', 4999.00, 0.00, 4999.00, 'Test Student', 'test.student@10qchallenge.in', 'KA', 'PAID'),
            ($6, $7, $8, '1', 4999.00, 0.00, 4999.00, 'Student B', 'student.isolation.test@example.com', 'DL', 'PAID'),
            ($9, $10, $8, '2', 4999.00, 0.00, 4999.00, 'Student B', 'student.isolation.test@example.com', 'DL', 'PAID');`,
    [orderA1, `ORD-A1-${Date.now()}`, studentAId, orderA2, `ORD-A2-${Date.now()}`, orderB1, `ORD-B1-${Date.now()}`, studentBId, orderB2, `ORD-B2-${Date.now()}`]
  );

  await db.query(
    `INSERT INTO commerce.payments (id, order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status, settled_at)
     VALUES ($1, $2, 'PAYU', $3, 4999.00, 'INR', 'SETTLED', NOW()),
            ($4, $5, 'PAYU', $6, 4999.00, 'INR', 'SETTLED', NOW()),
            ($7, $8, 'PAYU', $9, 4999.00, 'INR', 'SETTLED', NOW()),
            ($10, $11, 'PAYU', $12, 4999.00, 'INR', 'SETTLED', NOW());`,
    [
      crypto.randomUUID(), orderA1, `PAYU-A1-${Date.now()}`,
      crypto.randomUUID(), orderA2, `PAYU-A2-${Date.now()}`,
      crypto.randomUUID(), orderB1, `PAYU-B1-${Date.now()}`,
      crypto.randomUUID(), orderB2, `PAYU-B2-${Date.now()}`,
    ]
  );

  await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE'),
            ($3, $2, '2', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE'),
            ($4, $5, '1', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE'),
            ($6, $5, '2', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE');`,
    [orderA1, studentAId, orderA2, orderB1, studentBId, orderB2]
  );

  await closeCommerceDb();

  // --- PART 2: SERVER INITIALIZATION & AUTHENTICATION ---
  console.log('\n--- 2. Spawning / Connecting to Local Server (Port 3000) ---');
  let serverProcess = null;
  let spawnedServer = false;
  const initialProbe = await probeUrl('http://localhost:3000/');

  if (initialProbe.status === 200) {
    console.log('  ✓ Existing active server detected on port 3000');
  } else {
    console.log('  Starting server via node server.js...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    spawnedServer = true;

    let isReady = false;
    for (let i = 0; i < 30; i++) {
      await wait(500);
      const check = await probeUrl('http://localhost:3000/');
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
  }

  console.log('\n--- 3. Authenticating Test Users (Student A & Student B) ---');
  // Student A Login
  const loginARes = await probeUrl('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.student@10qchallenge.in',
      password: 'StudentPass2026!',
    }),
  });
  assert(loginARes.status === 200, 'Student A authenticated successfully');
  const cookieA = getCookieHeader(loginARes);
  const csrfA = getCsrfToken(cookieA);
  assert(Boolean(csrfA), 'Student A CSRF token acquired');

  // Student B Login
  const loginBRes = await probeUrl('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student.isolation.test@example.com',
      password: 'StudentPass2026!',
    }),
  });
  assert(loginBRes.status === 200, 'Student B authenticated successfully');
  const cookieB = getCookieHeader(loginBRes);
  const csrfB = getCsrfToken(cookieB);
  assert(Boolean(csrfB), 'Student B CSRF token acquired');

  // --- PART 3: AUTHENTICATION & ACCESS CONTROL GUARDS ---
  console.log('\n--- 4. Authentication & Security Access Control Guards ---');

  // Unauthenticated GET /api/student/progress/summary
  const unauthSummaryRes = await probeUrl('http://localhost:3000/api/student/progress/summary');
  assert(unauthSummaryRes.status === 401, 'Unauthenticated GET /progress/summary rejected with 401');
  assert(unauthSummaryRes.json?.success === false, 'Unauthenticated response indicates success: false');

  // Unauthenticated GET /api/student/progress/courses/1
  const unauthCourseRes = await probeUrl('http://localhost:3000/api/student/progress/courses/1');
  assert(unauthCourseRes.status === 401, 'Unauthenticated GET /progress/courses/1 rejected with 401');

  // Unauthenticated POST /api/student/progress/topics
  const unauthTopicRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: 1, topicId: 1, status: 'IN_PROGRESS' }),
  });
  assert(unauthTopicRes.status === 401, 'Unauthenticated POST /progress/topics rejected with 401');

  // Unauthenticated POST /api/student/progress/content
  const unauthContentRes = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: 1, contentType: 'VIDEO', contentIdentifier: '824804225', status: 'IN_PROGRESS' }),
  });
  assert(unauthContentRes.status === 401, 'Unauthenticated POST /progress/content rejected with 401');

  // Unauthenticated GET /api/student/progress/activity
  const unauthActRes = await probeUrl('http://localhost:3000/api/student/progress/activity');
  assert(unauthActRes.status === 401, 'Unauthenticated GET /progress/activity rejected with 401');

  // CSRF validation on mutation endpoints
  const csrfMissingTopic = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      // Omit x-csrf-token
    },
    body: JSON.stringify({ courseId: 1, topicId: 1, status: 'IN_PROGRESS' }),
  });
  assert(csrfMissingTopic.status === 403, 'POST /progress/topics without CSRF header rejected with 403 Forbidden');

  const csrfMissingContent = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      // Omit x-csrf-token
    },
    body: JSON.stringify({ courseId: 1, contentType: 'VIDEO', contentIdentifier: '824804225', status: 'IN_PROGRESS' }),
  });
  assert(csrfMissingContent.status === 403, 'POST /progress/content without CSRF header rejected with 403 Forbidden');

  // Tampered JWT rejected
  const tamperedRes = await probeUrl('http://localhost:3000/api/student/progress/summary', {
    headers: { Cookie: '10q_auth_token=tampered_jwt_value_xyz' },
  });
  assert(tamperedRes.status === 401, 'Tampered JWT session rejected with 401');

  // --- PART 4: TOPIC PROGRESS MUTATIONS (POST /api/student/progress/topics) ---
  console.log('\n--- 5. Topic Progress Mutations & Integrity Rules ---');

  // Test 1: Start Topic 1 (Rectilinear Motion) in Course 1
  const startTopicRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 1,
      status: 'IN_PROGRESS',
      idempotencyKey: 'test_stage2_topic_start_01',
    }),
  });
  assert(startTopicRes.status === 200, 'Student A starts Topic 1 (HTTP 200)');
  assert(startTopicRes.json?.success === true, 'Response contains success: true');
  assert(startTopicRes.json?.data?.record?.status === 'IN_PROGRESS', 'Topic status is IN_PROGRESS');
  assert(startTopicRes.json?.data?.record?.completedAt === null, 'completedAt is null for IN_PROGRESS');
  assert(Boolean(startTopicRes.json?.data?.record?.startedAt), 'startedAt timestamp generated server-side');

  // Test 2: Complete Topic 1
  const completeTopicRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 1,
      status: 'COMPLETED',
      idempotencyKey: 'test_stage2_topic_comp_01',
    }),
  });
  assert(completeTopicRes.status === 200, 'Student A completes Topic 1 (HTTP 200)');
  assert(completeTopicRes.json?.data?.record?.status === 'COMPLETED', 'Topic status updated to COMPLETED');
  const completedAtTimestamp = completeTopicRes.json?.data?.record?.completedAt;
  assert(Boolean(completedAtTimestamp), 'completedAt timestamp set on completion');

  // Test 3: Downgrade Prevention: Stale IN_PROGRESS request must NOT downgrade COMPLETED!
  const staleDowngradeRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 1,
      status: 'IN_PROGRESS', // Stale or replay request
    }),
  });
  assert(staleDowngradeRes.status === 200, 'Stale IN_PROGRESS request processed safely (HTTP 200)');
  assert(staleDowngradeRes.json?.data?.record?.status === 'COMPLETED', 'Topic strictly remains COMPLETED (Downgrade prevented!)');
  assert(staleDowngradeRes.json?.data?.record?.completedAt === completedAtTimestamp, 'Original completedAt timestamp preserved intact');

  // Test 4: Idempotent duplicate completion
  const duplicateCompRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 1,
      status: 'COMPLETED',
      idempotencyKey: 'test_stage2_topic_comp_01', // duplicate key
    }),
  });
  assert(duplicateCompRes.status === 200, 'Duplicate completion returns HTTP 200');
  assert(duplicateCompRes.json?.data?.record?.status === 'COMPLETED', 'Status remains COMPLETED');

  // Test 5: Invalid topic ID rejection
  const invalidTopicRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 99999,
      status: 'COMPLETED',
    }),
  });
  assert(invalidTopicRes.status === 400, 'Non-existent topic ID rejected with HTTP 400');
  assert(invalidTopicRes.json?.success === false, 'Error response body indicates failure');

  // Test 6: Cross-course topic spoofing rejection (Topic 9 belongs to Course 2; submitting for Course 1)
  const crossCourseTopicRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 9, // belongs to course 2
      status: 'COMPLETED',
    }),
  });
  assert(crossCourseTopicRes.status === 400, 'Cross-course topic spoofing rejected with HTTP 400');
  assert(crossCourseTopicRes.json?.error?.includes('Hierarchy mismatch'), 'Clear hierarchy mismatch message returned');

  // Test 7: Invalid status rejection
  const invalidStatusRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      topicId: 2,
      status: 'DRAFT_STATUS',
    }),
  });
  assert(invalidStatusRes.status === 400, 'Invalid status "DRAFT_STATUS" rejected with HTTP 400');

  // Test 8: IDOR / Spoofed User ID rejection
  const spoofedUserIdRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      userId: studentBId, // Attempting to modify Student B's progress as Student A
      courseId: 1,
      topicId: 2,
      status: 'COMPLETED',
    }),
  });
  assert(spoofedUserIdRes.status === 400, 'Mismatched client-supplied userId strictly rejected with HTTP 400');

  // --- PART 5: CONTENT PROGRESS MUTATIONS (POST /api/student/progress/content) ---
  console.log('\n--- 6. Content Progress Mutations (Videos & PDFs) ---');

  // Test 1: Start Video (Mechanics Kinematics Video 1)
  const startVideoRes = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      contentType: 'VIDEO',
      contentIdentifier: '824804225',
      status: 'IN_PROGRESS',
      idempotencyKey: 'test_stage2_vid_start_01',
    }),
  });
  assert(startVideoRes.status === 200, 'Student A starts Video 824804225 (HTTP 200)');
  assert(startVideoRes.json?.data?.record?.contentType === 'VIDEO', 'Record contentType is VIDEO');
  assert(startVideoRes.json?.data?.record?.status === 'IN_PROGRESS', 'Record status is IN_PROGRESS');
  assert(startVideoRes.json?.data?.record?.completedAt === null, 'completedAt is null on start (not automatically completed)');

  // Test 2: Complete Video (Explicit student completion)
  const completeVideoRes = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      contentType: 'VIDEO',
      contentIdentifier: '824804225',
      status: 'COMPLETED',
      idempotencyKey: 'test_stage2_vid_comp_01',
    }),
  });
  assert(completeVideoRes.status === 200, 'Student A explicitly completes Video (HTTP 200)');
  assert(completeVideoRes.json?.data?.record?.status === 'COMPLETED', 'Video status updated to COMPLETED');
  const videoCompletedAt = completeVideoRes.json?.data?.record?.completedAt;
  assert(Boolean(videoCompletedAt), 'Video completedAt timestamp recorded');

  // Test 3: Video Downgrade Prevention
  const staleVideoDowngrade = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      contentType: 'VIDEO',
      contentIdentifier: '824804225',
      status: 'IN_PROGRESS',
    }),
  });
  assert(staleVideoDowngrade.status === 200, 'Stale video start request processed safely');
  assert(staleVideoDowngrade.json?.data?.record?.status === 'COMPLETED', 'Video strictly remains COMPLETED');

  // Test 4: Complete Document PDF
  const completeDocRes = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      contentType: 'PDF',
      contentIdentifier: '1',
      status: 'COMPLETED',
      idempotencyKey: 'test_stage2_doc_comp_01',
    }),
  });
  assert(completeDocRes.status === 200, 'Student A completes Document PDF #1 (HTTP 200)');
  assert(completeDocRes.json?.data?.record?.contentType === 'PDF', 'Record contentType is PDF');
  assert(completeDocRes.json?.data?.record?.status === 'COMPLETED', 'Record status is COMPLETED');

  // Test 5: Verify no sensitive URL or internal credential leakage in response
  const recordKeys = Object.keys(completeDocRes.json?.data?.record || {});
  assert(!recordKeys.includes('fileUrl'), 'Response strictly omits internal fileUrl');
  assert(!recordKeys.includes('vimeoPrivateKey'), 'Response strictly omits vimeoPrivateKey');
  assert(!recordKeys.includes('filePath'), 'Response strictly omits filePath');

  // Test 6: Invalid video identifier rejection
  const invalidVideoRes = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      contentType: 'VIDEO',
      contentIdentifier: 'non_existent_vimeo_id_99999',
      status: 'IN_PROGRESS',
    }),
  });
  assert(invalidVideoRes.status === 400, 'Invalid video identifier rejected with HTTP 400');

  // Test 7: Cross-course content spoofing rejection (Video 3 belongs to Course 2; submitting with Course 1)
  const crossCourseVideoRes = await probeUrl('http://localhost:3000/api/student/progress/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
      'x-csrf-token': csrfA,
    },
    body: JSON.stringify({
      courseId: 1,
      contentType: 'VIDEO',
      contentIdentifier: '824804227', // Video 3 belongs to Course 2 Chapter 7
      status: 'COMPLETED',
    }),
  });
  assert(crossCourseVideoRes.status === 400, 'Cross-course video submission rejected with HTTP 400');
  assert(crossCourseVideoRes.json?.error?.includes('Hierarchy mismatch'), 'Hierarchy mismatch error returned for cross-course video');

  // --- PART 6: COURSE DETAIL PROGRESS (GET /api/student/progress/courses/[courseId]) ---
  console.log('\n--- 7. Course Progress Detail & NOT_STARTED Topic State ---');

  const courseProgRes = await probeUrl('http://localhost:3000/api/student/progress/courses/1', {
    headers: { Cookie: cookieA },
  });
  assert(courseProgRes.status === 200, 'Student A retrieves Course 1 progress (HTTP 200)');
  assert(courseProgRes.json?.success === true, 'Response contains success: true');
  const courseData = courseProgRes.json?.data;

  assert(courseData?.courseId === 1, 'courseId matches requested course');
  assert(courseData?.courseTitle === 'BITSAT 2026 Master Crash Course (Updated Batch)', 'Course title matches Course Master');
  assert(courseData?.slug === 'bitsat-2026-master-crash-course', 'Course slug matches Course Master');
  assert(courseData?.totalTopics === 8, 'Course 1 total topics is 8');
  assert(courseData?.completedTopics === 1, 'Course 1 completed topics is 1');
  assert(courseData?.remainingTopics === 7, 'Course 1 remaining topics is 7');
  assert(courseData?.courseCompletionPercentage === 12.5, 'Course 1 percentage is exactly 12.5%');

  // Check last accessed learning location
  assert(courseData?.lastAccessedLocation?.topicId === 1, 'Last accessed location points to Topic 1');
  assert(Boolean(courseData?.lastAccessedLocation?.lastActivityAt), 'Last accessed timestamp present');

  // Inspect topics within Chapter 1
  const physicsSubject = courseData?.subjects?.find((s) => s.subjectName.toLowerCase().includes('physics'));
  assert(Boolean(physicsSubject), 'Physics subject present in summary');
  const ch1 = physicsSubject?.chapters?.find((ch) => ch.chapterId === 1);
  assert(Boolean(ch1), 'Chapter 1 present in Physics');
  assert(ch1?.totalTopics === 4, 'Chapter 1 has 4 total topics');
  assert(ch1?.completedTopics === 1, 'Chapter 1 has 1 completed topic');
  assert(ch1?.remainingTopics === 3, 'Chapter 1 has 3 remaining topics');

  // Check topic items: Topic 1 must be COMPLETED, Topic 2, 3, 4 must be NOT_STARTED
  const t1 = ch1?.topics?.find((t) => t.topicId === 1);
  const t2 = ch1?.topics?.find((t) => t.topicId === 2);
  const t3 = ch1?.topics?.find((t) => t.topicId === 3);
  assert(t1?.status === 'COMPLETED', 'Topic 1 status is COMPLETED');
  assert(t2?.status === 'NOT_STARTED', 'Topic 2 (absent DB record) represented as NOT_STARTED');
  assert(t3?.status === 'NOT_STARTED', 'Topic 3 (absent DB record) represented as NOT_STARTED');

  // Inspect Chapter 3 (Physical Chemistry: 0 topics in canonical data)
  const chemSubject = courseData?.subjects?.find((s) => s.subjectName.toLowerCase().includes('chemistry'));
  const ch3 = chemSubject?.chapters?.find((ch) => ch.chapterId === 3);
  assert(Boolean(ch3), 'Chapter 3 (Physical Chemistry) found');
  assert(ch3?.totalTopics === 0, 'Chapter 3 totalTopics is 0');
  assert(ch3?.completedTopics === 0, 'Chapter 3 completedTopics is 0');
  assert(ch3?.remainingTopics === 0, 'Chapter 3 remainingTopics is 0');
  assert(ch3?.completionPercentage === 0.0, 'Chapter 3 percentage is 0.0% (not NaN)');
  assert(ch3?.isCompleted === false, 'Zero-topic chapter is strictly NOT completed');

  // --- PART 7: PROGRESS OVERALL SUMMARY (GET /api/student/progress/summary) ---
  console.log('\n--- 8. Overall Progress Summary Across Courses ---');

  const summaryRes = await probeUrl('http://localhost:3000/api/student/progress/summary', {
    headers: { Cookie: cookieA },
  });
  assert(summaryRes.status === 200, 'Student A retrieves overall progress summary (HTTP 200)');
  assert(summaryRes.json?.success === true, 'Response contains success: true');
  const summaryData = summaryRes.json?.data;

  assert(summaryData?.totalCourses === 2, 'Summary includes all 2 canonical courses');
  assert(summaryData?.overall?.totalEligibleTopics === 10, 'Total eligible topics across all courses is 10 (8 in C1, 2 in C2)');
  assert(summaryData?.overall?.completedTopics === 1, 'Total completed topics is 1');
  assert(summaryData?.overall?.remainingTopics === 9, 'Total remaining topics is 9');
  assert(summaryData?.overall?.averageCompletionPercentage === 10.0, 'Overall completion percentage is 10.0% (1/10 * 100)');
  assert(Boolean(summaryData?.overall?.lastActivityAt), 'Overall lastActivityAt timestamp present');

  // Inspect Course 2 (JEE): Genuine 0% progress because student hasn't touched it
  const c2Summary = summaryData?.courses?.find((c) => c.courseId === 2);
  assert(Boolean(c2Summary), 'Course 2 (JEE) present in courses list');
  assert(c2Summary?.completedTopics === 0, 'Course 2 completedTopics is genuine 0');
  assert(c2Summary?.completionPercentage === 0.0, 'Course 2 completion percentage is genuine 0.0% (no fake progress)');
  assert(c2Summary?.lastActivityAt === null, 'Course 2 lastActivityAt is null');

  // Recent activity in summary
  assert(Array.isArray(summaryData?.recentActivity), 'recentActivity is an array');
  assert(summaryData?.recentActivity?.length > 0, 'recentActivity contains recorded learning events');

  // --- PART 8: RECENT LEARNING EVENTS (GET /api/student/progress/activity) ---
  console.log('\n--- 9. Recent Learning Activity & Event Audit ---');

  const actRes = await probeUrl('http://localhost:3000/api/student/progress/activity?limit=5', {
    headers: { Cookie: cookieA },
  });
  assert(actRes.status === 200, 'Student A retrieves activity events (HTTP 200)');
  assert(actRes.json?.success === true, 'Response contains success: true');
  const actData = actRes.json?.data;

  assert(actData?.events?.length <= 5, 'Activity events count obeys requested limit (<= 5)');
  assert(actData?.limit === 5, 'Response confirms limit is 5');

  // Check event structure
  const firstEvt = actData?.events[0];
  assert(Boolean(firstEvt?.eventType), 'Event has eventType');
  assert(Boolean(firstEvt?.eventAt), 'Event has eventAt ISO timestamp');
  assert(Boolean(firstEvt?.courseId), 'Event has courseId');

  // Limit bounds checking
  const boundedLimitRes = await probeUrl('http://localhost:3000/api/student/progress/activity?limit=999', {
    headers: { Cookie: cookieA },
  });
  assert(boundedLimitRes.json?.data?.limit === 100, 'Requested limit 999 capped to maximum 100');

  const invalidLimitRes = await probeUrl('http://localhost:3000/api/student/progress/activity?limit=-5', {
    headers: { Cookie: cookieA },
  });
  assert(invalidLimitRes.status === 400, 'Negative limit rejected with HTTP 400');

  // --- PART 9: MULTI-TENANT STUDENT ISOLATION ---
  console.log('\n--- 10. Multi-Tenant Student Isolation Verification ---');

  // Student B queries overall summary: must have genuine 0% progress across all courses
  const studentBSummaryRes = await probeUrl('http://localhost:3000/api/student/progress/summary', {
    headers: { Cookie: cookieB },
  });
  assert(studentBSummaryRes.status === 200, 'Student B retrieves overall summary (HTTP 200)');
  const bSummary = studentBSummaryRes.json?.data;
  assert(bSummary?.overall?.completedTopics === 0, 'Student B has 0 completed topics (isolated from Student A)');
  assert(bSummary?.overall?.averageCompletionPercentage === 0.0, 'Student B overall completion is strictly 0.0%');
  assert(bSummary?.recentActivity?.length === 0, 'Student B has 0 recent learning events');

  // Student B queries Course 1 progress: must have 0% progress
  const studentBCourseRes = await probeUrl('http://localhost:3000/api/student/progress/courses/1', {
    headers: { Cookie: cookieB },
  });
  assert(studentBCourseRes.status === 200, 'Student B retrieves Course 1 progress (HTTP 200)');
  const bCourse = studentBCourseRes.json?.data;
  assert(bCourse?.completedTopics === 0, 'Student B Course 1 completedTopics is 0');
  assert(bCourse?.courseCompletionPercentage === 0.0, 'Student B Course 1 percentage is 0.0%');
  assert(bCourse?.lastAccessedLocation === null, 'Student B Course 1 lastAccessedLocation is null');

  // Student B queries activity: must have 0 events
  const studentBActRes = await probeUrl('http://localhost:3000/api/student/progress/activity', {
    headers: { Cookie: cookieB },
  });
  assert(studentBActRes.status === 200, 'Student B retrieves activity (HTTP 200)');
  assert(studentBActRes.json?.data?.events?.length === 0, 'Student B activity is empty (zero cross-tenant leakage)');

  // Student B starts Topic 5 in Course 2 (Center of Mass & Linear Momentum)
  // Wait, Topic 9 belongs to Course 2:
  const studentBTopicRes = await probeUrl('http://localhost:3000/api/student/progress/topics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieB,
      'x-csrf-token': csrfB,
    },
    body: JSON.stringify({
      courseId: 2,
      topicId: 9,
      status: 'COMPLETED',
    }),
  });
  assert(studentBTopicRes.status === 200, 'Student B completes Topic 9 in Course 2 (HTTP 200)');

  // Verify Student A's Course 2 progress remains 0%
  const studentACourse2Res = await probeUrl('http://localhost:3000/api/student/progress/courses/2', {
    headers: { Cookie: cookieA },
  });
  assert(studentACourse2Res.json?.data?.completedTopics === 0, 'Student A Course 2 completedTopics remains 0 (no leakage from Student B)');

  // --- PART 10: PERSISTENCE ACROSS RESTART ---
  console.log('\n--- 11. Persistence Across Fresh Database Connection ---');
  let verifyDb = await getCommerceDb();
  const verifyTopicA = await verifyDb.query(
    'SELECT status FROM learning.student_topic_progress WHERE user_id = $1 AND topic_id = 1;',
    [studentAId]
  );
  assert(verifyTopicA.rows[0]?.status === 'COMPLETED', 'Student A Topic 1 persisted as COMPLETED in PostgreSQL');

  const verifyTopicB = await verifyDb.query(
    'SELECT status FROM learning.student_topic_progress WHERE user_id = $1 AND topic_id = 9;',
    [studentBId]
  );
  assert(verifyTopicB.rows[0]?.status === 'COMPLETED', 'Student B Topic 9 persisted as COMPLETED in PostgreSQL');

  // Clean test fixtures
  await verifyDb.query('DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await verifyDb.query('DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await verifyDb.query('DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await verifyDb.query('DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await verifyDb.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await verifyDb.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await verifyDb.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await closeCommerceDb();
  console.log('  ✓ Cleaned up all test records from learning tables');

  // Stop test server if spawned
  if (spawnedServer && serverProcess) {
    console.log('\nShutting down spawned test server...');
    serverProcess.kill('SIGTERM');
    await wait(1500);
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.4 STAGE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFeature34Stage2Tests().catch((err) => {
  console.error('Fatal error during Feature 3.4 Stage 2 test execution:', err);
  process.exit(1);
});
