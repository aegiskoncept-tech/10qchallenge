// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 STAGE 4 END-TO-END QA & SECURITY SUITE
// Comprehensive Verification of Student Workflow, Multi-Tenant Isolation,
// CSRF & Downgrade Security, Enrollment & Classroom Boundaries, and Edge Cases
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

async function runStage4QA() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.4 STAGE 4 QA & SECURITY SUITE');
  console.log('Final End-to-End Workflow, Security, Boundaries & Edge Cases');
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

  // --- PART 1: STORAGE & DIRECTORY INTEGRITY ---
  console.log('--- 1. Storage & Identity Integrity ---');
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

  // Clean pre-existing test records for clean run
  await db.query('DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  // Clean and seed settled enrollment fixture for Student A
  await db.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await db.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await db.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  const order1Id = crypto.randomUUID();
  const order2Id = crypto.randomUUID();
  await db.query(
    `INSERT INTO commerce.orders (
      id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
      billing_full_name, billing_email, billing_state_code, status
    ) VALUES ($1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Test Student', 'test.student@10qchallenge.in', 'KA', 'PAID'),
             ($4, $5, $3, '2', 4999.00, 0.00, 4999.00, 'Test Student', 'test.student@10qchallenge.in', 'KA', 'PAID');`,
    [order1Id, `ORD-1-${Date.now()}`, studentAId, order2Id, `ORD-2-${Date.now()}`]
  );
  await db.query(
    `INSERT INTO commerce.payments (
      id, order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status, settled_at
    ) VALUES ($1, $2, 'PAYU', $3, 4999.00, 'INR', 'SETTLED', NOW()),
             ($4, $5, 'PAYU', $6, 4999.00, 'INR', 'SETTLED', NOW());`,
    [crypto.randomUUID(), order1Id, `PAYU-1-${Date.now()}`, crypto.randomUUID(), order2Id, `PAYU-2-${Date.now()}`]
  );
  await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE'),
            ($3, $2, '2', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE');`,
    [order1Id, studentAId, order2Id]
  );

  await closeCommerceDb();

  // --- PART 2: SERVER INITIALIZATION ---
  console.log('\n--- 2. Production Server Verification ---');
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

  const BASE_URL = 'http://localhost:3000';

  try {
    // --- PART 3: COMPLETE 13-STEP STUDENT WORKFLOW TEST ---
    console.log('\n--- 3. Complete 13-Step Student Workflow Test ---');

    // Step 1: Student A logs in
    const loginARes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.student@10qchallenge.in',
        password: 'StudentPass2026!',
      }),
    });
    assert(loginARes.status === 200, 'Step 1: Student A logs in successfully (HTTP 200)');
    let cookieA = getCookieHeader(loginARes);
    let csrfA = getCsrfToken(cookieA);
    assert(Boolean(csrfA), 'Step 1: CSRF token acquired for Student A session');

    // Step 2: Student A opens Learning Progress page
    const progressPageRes = await probeUrl(`${BASE_URL}/student/progress`, {
      headers: { Cookie: cookieA },
    });
    assert(progressPageRes.status === 200, 'Step 2: Student A opens Learning Progress page (HTTP 200)');
    assert(progressPageRes.text.length > 500, 'Step 2: Progress page serves valid HTML');

    // Step 3: Student A views settled courses
    const coursesRes = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: cookieA },
    });
    assert(coursesRes.status === 200, 'Step 3: Student A queries enrolled courses (HTTP 200)');
    const enrolledList = coursesRes.json?.data?.courses || [];
    const course1 = enrolledList.find((c) => c.courseId === '1');
    assert(Boolean(course1), 'Step 3: Settled Course 1 found in student enrolled courses');

    // Step 4: Student A opens course progress details
    const initCourse1Res = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieA },
    });
    assert(initCourse1Res.status === 200, 'Step 4: Student A opens Course 1 progress details (HTTP 200)');
    assert(initCourse1Res.json?.data?.courseId === 1, 'Step 4: Course ID matches 1');
    assert(initCourse1Res.json?.data?.completedTopics === 0, 'Step 4: Course 1 initial completedTopics is 0');
    assert(initCourse1Res.json?.data?.courseCompletionPercentage === 0, 'Step 4: Course 1 initial percentage is 0.00%');

    // Step 5: Student A marks a topic completed (Topic 1)
    const topicMutationRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
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
      }),
    });
    assert(topicMutationRes.status === 200, 'Step 5: Student A marks Topic 1 completed (HTTP 200)');

    // Step 6: Server confirms the change
    assert(topicMutationRes.json?.success === true, 'Step 6: Server confirms mutation success === true');
    assert(topicMutationRes.json?.data?.record?.status === 'COMPLETED', 'Step 6: Server confirms status: COMPLETED');
    const completionTimestamp = topicMutationRes.json?.data?.record?.completedAt;
    assert(Boolean(completionTimestamp), 'Step 6: Server confirms valid completedAt timestamp');

    // Step 7: Dashboard metrics update
    const updatedSummaryRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieA },
    });
    assert(updatedSummaryRes.status === 200, 'Step 7: Re-queried overall summary (HTTP 200)');
    assert(updatedSummaryRes.json?.data?.overall?.completedTopics === 1, 'Step 7: Overall completedTopics updated to 1');
    assert(updatedSummaryRes.json?.data?.overall?.averageCompletionPercentage > 0, 'Step 7: Overall percentage > 0%');

    // Step 8: Recent activity shows the completion event
    const activityFeedRes = await probeUrl(`${BASE_URL}/api/student/progress/activity?limit=5`, {
      headers: { Cookie: cookieA },
    });
    assert(activityFeedRes.status === 200, 'Step 8: Re-queried activity feed (HTTP 200)');
    const latestEvent = activityFeedRes.json?.data?.events?.[0];
    assert(latestEvent?.eventType === 'TOPIC_COMPLETED', 'Step 8: Recent activity shows TOPIC_COMPLETED');
    assert(latestEvent?.topicId === 1, 'Step 8: Recent activity points to Topic 1');

    // Step 9: Student A refreshes the page (Simulated GET on course drill-down)
    const refreshCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieA },
    });
    assert(refreshCourseRes.status === 200, 'Step 9: Page refresh re-fetches Course 1 details (HTTP 200)');

    // Step 10: The topic remains completed
    const refreshedTopic1 = refreshCourseRes.json?.data?.subjects?.[0]?.chapters?.[0]?.topics?.find(
      (t) => t.topicId === 1
    );
    assert(refreshedTopic1?.status === 'COMPLETED', 'Step 10: Topic 1 strictly remains COMPLETED after refresh');
    assert(refreshedTopic1?.completedAt === completionTimestamp, 'Step 10: CompletedAt timestamp preserved intact');

    // Step 11: Student A logs out and logs back in
    const logoutRes = await probeUrl(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookieA, 'x-csrf-token': csrfA },
    });
    assert(logoutRes.status === 200, 'Step 11: Student A logs out successfully');

    // Verify session terminated
    const unauthCheck = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieA },
    });
    assert(unauthCheck.status === 401, 'Step 11: Terminated session rejected with HTTP 401');

    // Fresh login for Student A
    const freshLoginARes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.student@10qchallenge.in',
        password: 'StudentPass2026!',
      }),
    });
    assert(freshLoginARes.status === 200, 'Step 11: Student A logs back in with fresh session');
    cookieA = getCookieHeader(freshLoginARes);
    csrfA = getCsrfToken(cookieA);

    // Step 12: The same progress remains visible across fresh login
    const freshSummaryRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieA },
    });
    assert(freshSummaryRes.status === 200, 'Step 12: Fresh session retrieves summary (HTTP 200)');
    assert(freshSummaryRes.json?.data?.overall?.completedTopics === 1, 'Step 12: Persistent completedTopics = 1 across fresh login');

    // Step 13: Student B logs in and sees only Student B's progress
    const loginBRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student.isolation.test@example.com',
        password: 'StudentPass2026!',
      }),
    });
    assert(loginBRes.status === 200, 'Step 13: Student B logs in (HTTP 200)');
    const cookieB = getCookieHeader(loginBRes);
    const csrfB = getCsrfToken(cookieB);

    const summaryBRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieB },
    });
    assert(summaryBRes.status === 200, 'Step 13: Student B retrieves summary (HTTP 200)');
    assert(summaryBRes.json?.data?.overall?.completedTopics === 0, 'Step 13: Student B has 0 completed topics (isolated from Student A)');
    assert(summaryBRes.json?.data?.recentActivity?.length === 0, 'Step 13: Student B has 0 learning events (isolated from Student A)');

    // --- PART 4: SECURITY AND ACCESS CONTROL AUDIT ---
    console.log('\n--- 4. Security & Access Control Deep Audit ---');

    // 4.1 Unauthenticated access rejected across all 5 endpoints
    const unauth1 = await probeUrl(`${BASE_URL}/api/student/progress/summary`);
    assert(unauth1.status === 401, 'Security: GET /progress/summary unauth rejected (401)');
    const unauth2 = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`);
    assert(unauth2.status === 401, 'Security: GET /progress/courses/1 unauth rejected (401)');
    const unauth3 = await probeUrl(`${BASE_URL}/api/student/progress/topics`, { method: 'POST' });
    assert(unauth3.status === 401, 'Security: POST /progress/topics unauth rejected (401)');
    const unauth4 = await probeUrl(`${BASE_URL}/api/student/progress/content`, { method: 'POST' });
    assert(unauth4.status === 401, 'Security: POST /progress/content unauth rejected (401)');
    const unauth5 = await probeUrl(`${BASE_URL}/api/student/progress/activity`);
    assert(unauth5.status === 401, 'Security: GET /progress/activity unauth rejected (401)');

    // 4.2 Cross-Tenant Query & Mutation Isolation
    const crossTenantCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1?userId=${studentAId}`, {
      headers: { Cookie: cookieB },
    });
    assert(crossTenantCourseRes.status === 403, 'Security: Non-enrolled Student B query with Student A userId param rejected with 403 Forbidden');
    assert(crossTenantCourseRes.json?.error?.includes('Forbidden'), 'Security: Error message explicitly enforces Forbidden enrollment boundary');

    // 4.3 CSRF Protection on Mutations
    const noCsrfMutRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({ courseId: 1, topicId: 2, status: 'COMPLETED' }),
    });
    assert(noCsrfMutRes.status === 403, 'Security: POST /topics without CSRF header rejected with 403 Forbidden');

    // 4.4 Downgrade Prevention
    const downgradeRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
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
      }),
    });
    assert(downgradeRes.status === 200, 'Security: Stale IN_PROGRESS request processed safely');
    assert(downgradeRes.json?.data?.record?.status === 'COMPLETED', 'Security: Status strictly remains COMPLETED (Downgrade prevented)');
    assert(downgradeRes.json?.data?.record?.completedAt === completionTimestamp, 'Security: Original completedAt timestamp preserved');

    // 4.5 Duplicate Completion Idempotency
    const duplicateRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
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
      }),
    });
    assert(duplicateRes.status === 200, 'Security: Duplicate completion returns 200 OK');
    assert(duplicateRes.json?.data?.record?.status === 'COMPLETED', 'Security: Status remains COMPLETED');

    // 4.6 Hierarchy Validation & Cross-Course Spoofing Rejection
    const crossCourseSpoofRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        courseId: 2, // Course 2 does NOT own Topic 1 (Topic 1 belongs to Course 1)
        topicId: 1,
        status: 'COMPLETED',
      }),
    });
    assert(crossCourseSpoofRes.status === 400, 'Security: Cross-course topic submission rejected with HTTP 400');
    assert(crossCourseSpoofRes.json?.error?.includes('Hierarchy mismatch'), 'Security: Clear hierarchy mismatch error returned');

    // 4.7 Client-Supplied User ID Override Rejection
    const idSpoofRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        userId: 9999, // Attempt to mutate for someone else
        courseId: 1,
        topicId: 2,
        status: 'COMPLETED',
      }),
    });
    assert(idSpoofRes.status === 400, 'Security: Client-supplied userId mismatch strictly rejected with HTTP 400');

    // 4.8 Content Security & Secret Omission
    const contentMutRes = await probeUrl(`${BASE_URL}/api/student/progress/content`, {
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
      }),
    });
    assert(contentMutRes.status === 200, 'Security: Video completion returns 200 OK');
    const contentKeys = Object.keys(contentMutRes.json?.data?.record || {});
    assert(!contentKeys.includes('fileUrl'), 'Security: Response strictly omits internal fileUrl');
    assert(!contentKeys.includes('vimeoPrivateKey'), 'Security: Response strictly omits vimeoPrivateKey');
    assert(!contentKeys.includes('filePath'), 'Security: Response strictly omits filePath');

    // --- PART 5: ENROLLMENT & CLASSROOM BOUNDARIES ---
    console.log('\n--- 5. Enrollment & Classroom Access Boundaries ---');

    // 5.1 Enrolled Courses Policy Enforcement
    const enrRes = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: cookieA },
    });
    assert(enrRes.status === 200, 'Boundaries: Query enrolled courses API (HTTP 200)');
    const allCourses = enrRes.json?.data?.courses || [];
    for (const c of allCourses) {
      assert(c.classroomAccessEligible === false, `Boundaries: Course #${c.courseId} classroomAccessEligible is strictly false`);
      assert(Boolean(c.classroomStatusNotice), `Boundaries: Course #${c.courseId} includes locked classroom notice`);
    }

    // 5.2 Progress records do NOT grant enrollment
    // Student B has NO enrolled courses
    const enrBRes = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: cookieB },
    });
    assert(enrBRes.status === 200, 'Boundaries: Query Student B enrolled courses (HTTP 200)');
    assert(enrBRes.json?.data?.courses?.length === 0, 'Boundaries: Student B has 0 enrollments despite progress tracking availability');

    // --- PART 6: COMPREHENSIVE EDGE CASES ---
    console.log('\n--- 6. Comprehensive Edge Cases ---');

    // 6.1 Zero-Topic Chapter (Course 1 Chapter 3 Physical Chemistry)
    const c1EdgeRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieA },
    });
    const ch3 = c1EdgeRes.json?.data?.subjects?.find((s) => s.subjectId === 2)?.chapters?.find((c) => c.chapterId === 3);
    assert(Boolean(ch3), 'Edge Cases: Physical Chemistry chapter found');
    assert(ch3.totalTopics === 0, 'Edge Cases: Physical Chemistry totalTopics is 0');
    assert(ch3.completedTopics === 0, 'Edge Cases: Physical Chemistry completedTopics is 0');
    assert(ch3.completionPercentage === 0, 'Edge Cases: Physical Chemistry completionPercentage is 0 (NOT NaN)');
    assert(ch3.isCompleted === false, 'Edge Cases: Zero-topic chapter is strictly NOT completed');

    // 6.2 Course with No Progress (Course 2 JEE)
    const c2Summary = freshSummaryRes.json?.data?.courses?.find((c) => c.courseId === 2);
    assert(Boolean(c2Summary), 'Edge Cases: Course 2 found in summary');
    assert(c2Summary.completedTopics === 0, 'Edge Cases: Course 2 completedTopics is 0');
    assert(c2Summary.completionPercentage === 0, 'Edge Cases: Course 2 completionPercentage is 0.0% (genuine, no fake %)');
    assert(c2Summary.lastActivityAt === null, 'Edge Cases: Course 2 lastActivityAt is null');

    // 6.3 Student with No Progress (Student B)
    assert(summaryBRes.json?.data?.overall?.completedTopics === 0, 'Edge Cases: Student B has 0 completed topics');
    assert(summaryBRes.json?.data?.overall?.averageCompletionPercentage === 0, 'Edge Cases: Student B has 0.00%');
    assert(summaryBRes.json?.data?.overall?.lastActivityAt === null, 'Edge Cases: Student B lastActivityAt is null');

    // 6.4 Non-Existent Course ID Handling
    const nonExistentCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/99999`, {
      headers: { Cookie: cookieA },
    });
    assert(nonExistentCourseRes.status === 404, 'Edge Cases: Non-existent course ID returns 404 Not Found');

    // 6.5 Invalid Status Mutation Handling
    const invalidStatusRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        courseId: 1,
        topicId: 2,
        status: 'INVALID_STATUS',
      }),
    });
    assert(invalidStatusRes.status === 400, 'Edge Cases: Invalid mutation status returns 400 Bad Request');

    // --- PART 7: POSTGRESQL DURABLE PERSISTENCE VERIFICATION ---
    console.log('\n--- 7. PostgreSQL Durable Persistence Deep Verification ---');
    db = await getCommerceDb();

    // Verify Student A records in PostgreSQL
    const topicRow = await db.query(
      'SELECT * FROM learning.student_topic_progress WHERE user_id = $1 AND topic_id = $2;',
      [studentAId, 1]
    );
    assert(topicRow.rows.length === 1, 'Persistence: Exactly 1 row in student_topic_progress for Student A Topic 1');
    assert(topicRow.rows[0].status === 'COMPLETED', 'Persistence: Row status is COMPLETED in PostgreSQL');
    assert(Boolean(topicRow.rows[0].completed_at), 'Persistence: completed_at is durably stored in PostgreSQL');

    const contentRow = await db.query(
      'SELECT * FROM learning.student_content_progress WHERE user_id = $1 AND content_identifier = $2;',
      [studentAId, '824804225']
    );
    assert(contentRow.rows.length === 1, 'Persistence: Video progress row exists in PostgreSQL');
    assert(contentRow.rows[0].status === 'COMPLETED', 'Persistence: Video status is COMPLETED');

    const eventsRows = await db.query(
      'SELECT * FROM learning.student_learning_events WHERE user_id = $1 ORDER BY event_at ASC;',
      [studentAId]
    );
    assert(eventsRows.rows.length >= 2, `Persistence: ${eventsRows.rows.length} learning events durably stored in PostgreSQL`);

    const activityRow = await db.query(
      'SELECT * FROM learning.student_course_activity WHERE user_id = $1 AND course_id = $2;',
      [studentAId, 1]
    );
    assert(activityRow.rows.length === 1, 'Persistence: Course activity snapshot exists in PostgreSQL');
    assert(Number(activityRow.rows[0].last_accessed_topic_id) === 1, 'Persistence: Snapshot last_accessed_topic_id is 1');

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
      await db.query('DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await db.query('DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await db.query('DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await db.query('DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await db.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
      await db.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
      await db.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await closeCommerceDb();
      console.log('  ✓ Cleaned up test records from PostgreSQL learning schema and commerce fixtures');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.4 STAGE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage4QA().catch((err) => {
  console.error('Unhandled Stage 4 error:', err);
  process.exit(1);
});
