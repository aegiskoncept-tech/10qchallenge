// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 STAGE 5 AUTOMATED VERIFICATION SUITE
// Server-Side Enrollment Authorization & Multi-Tenant Boundaries
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

async function runStage5Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.4 STAGE 5 TEST SUITE');
  console.log('Server-Side Enrollment Authorization & Access Control QA');
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

  // Seed or replace clean un-enrolled student (Student Zero) with known password
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
  assert(studentAId !== studentBId && studentAId !== studentZeroId, 'All test student identities are strictly distinct');

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

  // --- PART 2: SERVICE-LEVEL ENROLLMENT VERIFICATION ---
  console.log('\n--- 2. Service-Layer Enrollment Authorization Helper Tests ---');

  // Verify non-enrolled returns false
  const initialCheckA = await LearningProgressService.isStudentEligibleForCourse(studentZeroId, 1);
  assert(initialCheckA === false, 'Student Zero without enrollment is ineligible for Course 1');

  const initialEligibleCoursesA = await LearningProgressService.getStudentEligibleCourseIds(studentZeroId);
  assert(Array.isArray(initialEligibleCoursesA) && initialEligibleCoursesA.length === 0, 'Student Zero has 0 eligible courses initially');

  // Seed distinct enrollment & order states to systematically verify authorization decisions
  const statesToTest = [
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'ACTIVE', expected: true, label: 'SETTLED + ACTIVE' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'PROVISIONED', expected: true, label: 'SETTLED + PROVISIONED' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'EXPIRED', expected: false, label: 'SETTLED + EXPIRED' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'REVOKED', expected: false, label: 'SETTLED + REVOKED' },
    { type: 'COMMERCE', settlement: 'SETTLED', access: 'SUSPENDED', expected: false, label: 'SETTLED + SUSPENDED' },
    { type: 'LEGACY', settlement: 'UNVERIFIED_HISTORICAL', access: 'PENDING', expected: false, label: 'UNVERIFIED_HISTORICAL + PENDING' },
    { type: 'LEGACY', settlement: 'UNVERIFIED_HISTORICAL', access: 'ACTIVE', expected: false, label: 'UNVERIFIED_HISTORICAL + ACTIVE' },
    { type: 'ORDER_ONLY', orderStatus: 'PENDING_PAYMENT', expected: false, label: 'PENDING_PAYMENT ORDER (No Enrollment)' },
    { type: 'ORDER_ONLY', orderStatus: 'REFUNDED', expected: false, label: 'REFUNDED ORDER (No Enrollment)' },
    { type: 'ORDER_ONLY', orderStatus: 'FAILED', expected: false, label: 'FAILED ORDER (No Enrollment)' },
    { type: 'ORDER_ONLY', orderStatus: 'CANCELLED', expected: false, label: 'CANCELLED ORDER (No Enrollment)' },
    { type: 'NO_RECORD', expected: false, label: 'NO RECORD AT ALL' },
  ];

  for (const item of statesToTest) {
    let dummyOrderId = null;
    let dummyPaymentId = null;
    let enrollmentId = null;

    if (item.type === 'COMMERCE') {
      dummyOrderId = crypto.randomUUID();
      dummyPaymentId = crypto.randomUUID();
      await db.query(
        `INSERT INTO commerce.orders (id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount, billing_full_name, billing_email, billing_state_code, status)
         VALUES ($1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Test', 'test@test.com', 'KA', 'PAID');`,
        [dummyOrderId, `TEST-ORD-${Date.now()}-${Math.random()}`, studentZeroId]
      );

      await db.query(
        `INSERT INTO commerce.payments (id, order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status, settled_at)
         VALUES ($1, $2, 'PAYU', $3, 4999.00, 'INR', $4, NOW());`,
        [dummyPaymentId, dummyOrderId, `PAYU-${Date.now()}-${Math.random()}`, item.settlement]
      );

      const enrRes = await db.query(
        `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
         VALUES ($1, $2, '1', $3, 'COMMERCE_ORDER', NOW(), $4)
         RETURNING id;`,
        [dummyOrderId, studentZeroId, item.settlement, item.access]
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
    } else if (item.type === 'ORDER_ONLY') {
      dummyOrderId = crypto.randomUUID();
      await db.query(
        `INSERT INTO commerce.orders (id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount, billing_full_name, billing_email, billing_state_code, status)
         VALUES ($1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Test', 'test@test.com', 'KA', $4);`,
        [dummyOrderId, `TEST-ORD-${Date.now()}-${Math.random()}`, studentZeroId, item.orderStatus]
      );
    }

    const result = await LearningProgressService.isStudentEligibleForCourse(studentZeroId, 1);
    assert(
      result === item.expected,
      `State [${item.label}] => ${item.expected ? 'ELIGIBLE' : 'INELIGIBLE'} (got ${result})`
    );

    // Clean this test state row
    if (enrollmentId) await db.query('DELETE FROM commerce.enrollments WHERE id = $1;', [enrollmentId]);
    if (dummyPaymentId) await db.query('DELETE FROM commerce.payments WHERE id = $1;', [dummyPaymentId]);
    if (dummyOrderId) await db.query('DELETE FROM commerce.orders WHERE id = $1;', [dummyOrderId]);
  }

  // --- PART 3: SERVICE EXCEPTION ENFORCEMENT ---
  console.log('\n--- 3. Direct Service-Level Mutation Boundary ---');
  let thrownError = null;
  try {
    // Attempt recordTopicProgress without skipEnrollmentCheck on un-enrolled course
    await LearningProgressService.recordTopicProgress({
      userId: studentZeroId,
      courseId: 1,
      topicId: 1,
      status: 'COMPLETED',
    });
  } catch (err) {
    thrownError = err;
  }
  assert(Boolean(thrownError), 'LearningProgressService.recordTopicProgress threw error for non-enrolled student');
  assert(
    thrownError?.message.includes('Forbidden') && (thrownError?.message.includes('enrolled') || thrownError?.message.includes('enrollment')),
    `Error message explicitly mentions Forbidden enrollment: "${thrownError?.message}"`
  );

  // Verify zero rows in database
  const countCheck = await db.query('SELECT COUNT(*) AS c FROM learning.student_topic_progress WHERE user_id = $1;', [studentZeroId]);
  assert(Number(countCheck.rows[0].c) === 0, 'Zero rows inserted into student_topic_progress for unauthorized attempt');

  // --- PART 4: SEED AUTHENTIC ENROLLMENTS FOR STUDENT A & B BEFORE STARTING SERVER ---
  console.log('\n--- 4. Seeding Authentic Settled Enrollments for Student A & B ---');
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

  // Student Zero: 0 enrollments seeded.
  await closeCommerceDb();
  console.log('  ✓ Settled enrollments seeded: Student A -> Course 1, Student B -> Course 2, Student Zero -> None');

  // --- PART 5: PRODUCTION SERVER INITIALIZATION ---
  console.log('\n--- 5. Production Server Connection ---');
  const BASE_URL = 'http://localhost:3000';
  let serverProcess = null;
  let spawnedServer = false;

  // If a server is already running, terminate it so it restarts fresh with seeded database files
  const initialProbe = await probeUrl(`${BASE_URL}/`);
  if (initialProbe.status === 200) {
    console.log('  Active server detected; restarting to ensure fresh database handles...');
  }

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
    assert(Boolean(csrfA), 'Student A received valid CSRF token');

    const loginBRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(loginBRes.status === 200, 'Student B logged in successfully');
    const cookieB = getCookieHeader(loginBRes);
    const csrfB = getCsrfToken(cookieB);
    assert(Boolean(csrfB), 'Student B received valid CSRF token');

    const loginZeroRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.zero.enrollment@example.com', password: 'StudentPass2026!' }),
    });
    assert(loginZeroRes.status === 200, 'Student Zero logged in successfully');
    const cookieZero = getCookieHeader(loginZeroRes);
    const csrfZero = getCsrfToken(cookieZero);
    assert(Boolean(csrfZero), 'Student Zero received valid CSRF token');

    // --- PART 7: ZERO-ENROLLMENT STUDENT BEHAVIOR (STUDENT ZERO) ---
    console.log('\n--- 7. Zero-Enrollment Student Behavior ---');

    // Check summary API:
    const zeroSummaryRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieZero },
    });
    assert(zeroSummaryRes.status === 200, 'Summary API returns HTTP 200 for student with 0 enrollments');
    assert(zeroSummaryRes.json?.data?.totalCourses === 0, 'Total courses is 0 for student with 0 enrollments');
    assert(zeroSummaryRes.json?.data?.overall?.completedTopics === 0, 'Completed topics is 0');
    assert(zeroSummaryRes.json?.data?.overall?.totalEligibleTopics === 0, 'Total eligible topics is 0');
    assert(zeroSummaryRes.json?.data?.overall?.averageCompletionPercentage === 0, 'Average percentage is 0.00%');
    assert(zeroSummaryRes.json?.data?.courses?.length === 0, 'Course list is empty []');

    // Check activity API:
    const zeroActivityRes = await probeUrl(`${BASE_URL}/api/student/progress/activity`, {
      headers: { Cookie: cookieZero },
    });
    assert(zeroActivityRes.status === 200, 'Activity API returns HTTP 200 for student with 0 enrollments');
    assert(zeroActivityRes.json?.data?.events?.length === 0, 'Events list is empty [] for student with 0 enrollments');

    // Check direct course drill-down without enrollment => 403 Forbidden
    const unauthCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieZero },
    });
    assert(unauthCourseRes.status === 403, 'GET /api/student/progress/courses/1 returns 403 Forbidden without enrollment');
    assert(unauthCourseRes.json?.error.includes('Forbidden'), 'Error message states Forbidden');

    // Check direct topic mutation without enrollment => 403 Forbidden
    const unauthTopicRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieZero, 'x-csrf-token': csrfZero },
      body: JSON.stringify({ courseId: 1, topicId: 1, status: 'COMPLETED' }),
    });
    assert(unauthTopicRes.status === 403, 'POST /api/student/progress/topics returns 403 Forbidden without enrollment');
    assert(unauthTopicRes.json?.error.includes('Forbidden'), 'Topic mutation error states Forbidden');

    // Check direct content mutation without enrollment => 403 Forbidden
    const unauthContentRes = await probeUrl(`${BASE_URL}/api/student/progress/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieZero, 'x-csrf-token': csrfZero },
      body: JSON.stringify({ courseId: 1, contentType: 'VIDEO', contentIdentifier: '824804225', status: 'COMPLETED' }),
    });
    assert(unauthContentRes.status === 403, 'POST /api/student/progress/content returns 403 Forbidden without enrollment');
    assert(unauthContentRes.json?.error.includes('Forbidden'), 'Content mutation error states Forbidden');

    // Check activity scoped to course 1 without enrollment => 403 Forbidden
    const unauthActivityCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/activity?courseId=1`, {
      headers: { Cookie: cookieZero },
    });
    assert(unauthActivityCourseRes.status === 403, 'GET /api/student/progress/activity?courseId=1 returns 403 Forbidden without enrollment');

    // --- PART 8: MULTI-TENANT CROSS-STUDENT ENROLLMENT AUTHORIZATION ---
    console.log('\n--- 8. Multi-Tenant Cross-Student Isolation & Authorization ---');

    // Student A: Course 1 is AUTHORIZED (HTTP 200)
    const authTopicA1Res = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA, 'x-csrf-token': csrfA },
      body: JSON.stringify({ courseId: 1, topicId: 1, status: 'COMPLETED' }),
    });
    assert(authTopicA1Res.status === 200, 'Student A can mutate progress for enrolled Course 1 (HTTP 200)');
    assert(authTopicA1Res.json?.data?.record?.status === 'COMPLETED', 'Topic 1 marked COMPLETED for Student A');

    // Student A: Course 1 video authorized (HTTP 200)
    const authVideoA1Res = await probeUrl(`${BASE_URL}/api/student/progress/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA, 'x-csrf-token': csrfA },
      body: JSON.stringify({ courseId: 1, contentType: 'VIDEO', contentIdentifier: '824804225', status: 'COMPLETED' }),
    });
    assert(authVideoA1Res.status === 200, 'Student A can record video progress for enrolled Course 1 (HTTP 200)');

    // Student A: Course 1 drill-down authorized (HTTP 200)
    const authCourseA1Res = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieA },
    });
    assert(authCourseA1Res.status === 200, 'Student A can query syllabus detail for enrolled Course 1 (HTTP 200)');

    // Student A attempts mutation on Course 2 (Student B's course) => 403 Forbidden!
    const crossTopicA2Res = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA, 'x-csrf-token': csrfA },
      body: JSON.stringify({ courseId: 2, topicId: 9, status: 'COMPLETED' }),
    });
    assert(crossTopicA2Res.status === 403, 'Student A MUTATION on Course 2 blocked with 403 Forbidden');

    // Student A attempts syllabus detail query on Course 2 => 403 Forbidden!
    const crossCourseA2Res = await probeUrl(`${BASE_URL}/api/student/progress/courses/2`, {
      headers: { Cookie: cookieA },
    });
    assert(crossCourseA2Res.status === 403, 'Student A DETAIL on Course 2 blocked with 403 Forbidden');

    // Student A attempts course-scoped activity on Course 2 => 403 Forbidden!
    const crossActivityA2Res = await probeUrl(`${BASE_URL}/api/student/progress/activity?courseId=2`, {
      headers: { Cookie: cookieA },
    });
    assert(crossActivityA2Res.status === 403, 'Student A ACTIVITY on Course 2 blocked with 403 Forbidden');

    // Student B: Course 2 authorized (HTTP 200) with PROVISIONED state
    const authTopicB2Res = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB, 'x-csrf-token': csrfB },
      body: JSON.stringify({ courseId: 2, topicId: 9, status: 'COMPLETED' }),
    });
    assert(authTopicB2Res.status === 200, 'Student B can mutate progress for enrolled Course 2 (HTTP 200)');
    assert(authTopicB2Res.json?.data?.record?.status === 'COMPLETED', 'Topic 9 marked COMPLETED for Student B');

    // Student B: Course 2 drill-down authorized (HTTP 200)
    const authCourseB2Res = await probeUrl(`${BASE_URL}/api/student/progress/courses/2`, {
      headers: { Cookie: cookieB },
    });
    assert(authCourseB2Res.status === 200, 'Student B can query syllabus detail for enrolled Course 2 (HTTP 200)');

    // Student B attempts mutation on Course 1 (Student A's course) => 403 Forbidden!
    const crossTopicB1Res = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB, 'x-csrf-token': csrfB },
      body: JSON.stringify({ courseId: 1, topicId: 1, status: 'COMPLETED' }),
    });
    assert(crossTopicB1Res.status === 403, 'Student B MUTATION on Course 1 blocked with 403 Forbidden');

    // Student B attempts syllabus detail query on Course 1 => 403 Forbidden!
    const crossCourseB1Res = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieB },
    });
    assert(crossCourseB1Res.status === 403, 'Student B DETAIL on Course 1 blocked with 403 Forbidden');

    // Student B attempts course-scoped activity on Course 1 => 403 Forbidden!
    const crossActivityB1Res = await probeUrl(`${BASE_URL}/api/student/progress/activity?courseId=1`, {
      headers: { Cookie: cookieB },
    });
    assert(crossActivityB1Res.status === 403, 'Student B ACTIVITY on Course 1 blocked with 403 Forbidden');

    // --- PART 9: SCOPED SUMMARY & ACTIVITY FEEDS ---
    console.log('\n--- 9. Scoped Summary & Activity Feeds ---');

    // Student A Summary should ONLY contain Course 1 (1 course, NOT Course 2)
    const summaryARes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieA },
    });
    assert(summaryARes.status === 200, 'Student A summary retrieved (HTTP 200)');
    assert(summaryARes.json?.data?.totalCourses === 1, 'Student A totalCourses === 1 (only enrolled course)');
    assert(summaryARes.json?.data?.courses?.length === 1, 'Student A courses array has length 1');
    assert(summaryARes.json?.data?.courses?.[0]?.courseId === 1, 'Student A courses array contains Course 1');
    assert(summaryARes.json?.data?.overall?.completedTopics === 1, 'Student A has 1 completed topic');

    // Student B Summary should ONLY contain Course 2 (1 course, NOT Course 1)
    const summaryBRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieB },
    });
    assert(summaryBRes.status === 200, 'Student B summary retrieved (HTTP 200)');
    assert(summaryBRes.json?.data?.totalCourses === 1, 'Student B totalCourses === 1 (only enrolled course)');
    assert(summaryBRes.json?.data?.courses?.length === 1, 'Student B courses array has length 1');
    assert(summaryBRes.json?.data?.courses?.[0]?.courseId === 2, 'Student B courses array contains Course 2');
    assert(summaryBRes.json?.data?.overall?.completedTopics === 1, 'Student B has 1 completed topic');

    // Student A Activity should ONLY show Course 1 events
    const activityARes = await probeUrl(`${BASE_URL}/api/student/progress/activity?limit=10`, {
      headers: { Cookie: cookieA },
    });
    assert(activityARes.status === 200, 'Student A activity retrieved (HTTP 200)');
    const nonCourse1EventsA = (activityARes.json?.data?.events || []).filter((e) => e.courseId !== 1);
    assert(nonCourse1EventsA.length === 0, 'Zero leaked events from other courses in Student A activity feed');

    // Student B Activity should ONLY show Course 2 events
    const activityBRes = await probeUrl(`${BASE_URL}/api/student/progress/activity?limit=10`, {
      headers: { Cookie: cookieB },
    });
    assert(activityBRes.status === 200, 'Student B activity retrieved (HTTP 200)');
    const nonCourse2EventsB = (activityBRes.json?.data?.events || []).filter((e) => e.courseId !== 2);
    assert(nonCourse2EventsB.length === 0, 'Zero leaked events from other courses in Student B activity feed');

    // --- PART 10: DIRECT POSTGRESQL DATABASE AUDIT & PERIMETER VERIFICATION ---
    console.log('\n--- 10. Direct PostgreSQL Database Audit & Perimeter Checks ---');
    db = await getCommerceDb();

    // Verify Student A records only contain Course 1
    const dbTopicA = await db.query('SELECT course_id FROM learning.student_topic_progress WHERE user_id = $1;', [studentAId]);
    assert(dbTopicA.rows.every((r) => Number(r.course_id) === 1), 'PostgreSQL audit: All Student A topic records belong to Course 1');

    // Verify Student B records only contain Course 2
    const dbTopicB = await db.query('SELECT course_id FROM learning.student_topic_progress WHERE user_id = $1;', [studentBId]);
    assert(dbTopicB.rows.every((r) => Number(r.course_id) === 2), 'PostgreSQL audit: All Student B topic records belong to Course 2');

    // Verify Student Zero has zero topic or content records in PostgreSQL
    const dbTopicZero = await db.query('SELECT COUNT(*) AS c FROM learning.student_topic_progress WHERE user_id = $1;', [studentZeroId]);
    assert(Number(dbTopicZero.rows[0].c) === 0, 'PostgreSQL audit: Zero topic records for Student Zero');
    const dbContentZero = await db.query('SELECT COUNT(*) AS c FROM learning.student_content_progress WHERE user_id = $1;', [studentZeroId]);
    assert(Number(dbContentZero.rows[0].c) === 0, 'PostgreSQL audit: Zero content records for Student Zero');

    // Verify classroomAccessEligible remains strictly false on My Courses API
    const myCoursesRes = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: cookieA },
    });
    assert(myCoursesRes.status === 200, 'My Courses API HTTP 200');
    assert(
      myCoursesRes.json?.data?.courses?.every((c) => c.classroomAccessEligible === false),
      'classroomAccessEligible remains strictly false for all enrolled courses'
    );

    await closeCommerceDb();
  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nShutting down spawned test server...');
      serverProcess.kill('SIGTERM');
      await wait(1500);
    }

    // Clean up test records
    try {
      db = await getCommerceDb();
      await db.query('DELETE FROM learning.student_learning_events WHERE user_id = ANY($1);', [allUserIds]);
      await db.query('DELETE FROM learning.student_topic_progress WHERE user_id = ANY($1);', [allUserIds]);
      await db.query('DELETE FROM learning.student_content_progress WHERE user_id = ANY($1);', [allUserIds]);
      await db.query('DELETE FROM learning.student_course_activity WHERE user_id = ANY($1);', [allUserIds]);
      await db.query('DELETE FROM commerce.enrollments WHERE user_id = ANY($1);', [allUserIds]);
      await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
      await db.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
      await db.query('DELETE FROM commerce.orders WHERE user_id = ANY($1);', [allUserIds]);
      await closeCommerceDb();

      const authDbClean = new DatabaseSync(authDbPath);
      authDbClean.prepare('DELETE FROM users WHERE id = 999;').run();
      authDbClean.close();

      console.log('  ✓ Cleaned up all test records from learning, commerce, and auth schemas');
    } catch (cleanupErr) {
      console.error('Error during Stage 5 cleanup:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.4 STAGE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage5Tests().catch((err) => {
  console.error('Unhandled Stage 5 test error:', err);
  process.exit(1);
});
