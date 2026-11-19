// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 AUTOMATED TEST SUITE: STAGE 3
// Student Learning Progress Dashboard & Course Integration:
// - /student/progress Frontend Page & Component Hierarchy
// - Student Sidebar Navigation Integration
// - Real Data Integration with Progress APIs (Summary, Detail, Mutation, Activity)
// - Interactive Topic Completion with CSRF Protection
// - Zero-Topic Chapter Safety (No NaN, Safe Notice)
// - Multi-Tenant Data Isolation (Student A vs Student B)
// - Strict Classroom Access Policy Guard (Classroom Locked)
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

async function runFeature34Stage3Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.4 STAGE 3 VERIFICATION SUITE');
  console.log('Student Learning Progress Dashboard & Course Integration');
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

  // --- PART 1: SOURCE FILES & INTEGRATION SANITY CHECK ---
  console.log('--- 1. Source Files & Static Structure Integrity ---');

  const pagePath = path.join(
    process.cwd(),
    'frontend',
    'app',
    '(student)',
    'student',
    'progress',
    'page.tsx'
  );
  assert(fs.existsSync(pagePath), 'frontend/app/(student)/student/progress/page.tsx exists');

  const pageSource = fs.readFileSync(pagePath, 'utf-8');
  assert(
    pageSource.includes('/api/student/progress/summary'),
    'Page queries /api/student/progress/summary'
  );
  assert(
    pageSource.includes('/api/student/courses'),
    'Page queries authoritative /api/student/courses'
  );
  assert(
    pageSource.includes('/api/student/progress/courses/'),
    'Page queries /api/student/progress/courses/[courseId]'
  );
  assert(
    pageSource.includes('/api/student/progress/topics'),
    'Page posts mutations to /api/student/progress/topics'
  );
  assert(
    pageSource.includes('x-csrf-token') || pageSource.includes('csrfToken'),
    'Page includes CSRF protection for topic mutations'
  );
  assert(
    pageSource.includes('Learning Progress & Syllabus Tracker') ||
      pageSource.includes('Learning Progress'),
    'Page displays Learning Progress title'
  );
  assert(
    pageSource.includes('No topics currently published in this chapter'),
    'Page includes zero-topic chapter safe empty state'
  );
  assert(
    !pageSource.includes('fakeProgress') && !pageSource.includes('mockTopics'),
    'Page contains no fake or mock progress generators'
  );
  assert(
    pageSource.includes('Classroom Access & Syllabus Progress Policy') ||
      pageSource.includes('Classroom access enforcement'),
    'Page communicates classroom access enforcement policy'
  );

  const sidebarPath = path.join(
    process.cwd(),
    'frontend',
    'components',
    'student',
    'StudentSidebar.tsx'
  );
  assert(fs.existsSync(sidebarPath), 'frontend/components/student/StudentSidebar.tsx exists');

  const sidebarSource = fs.readFileSync(sidebarPath, 'utf-8');
  assert(
    sidebarSource.includes('/student/progress'),
    'StudentSidebar contains link to /student/progress'
  );
  assert(
    sidebarSource.includes('Learning Progress'),
    'StudentSidebar contains "Learning Progress" nav item'
  );

  // --- PART 2: AUTH & POSTGRESQL ENVIRONMENT INITIALIZATION ---
  console.log('\n--- 2. Database Environment & User Identity Pre-Check ---');

  const pgDir = path.join(process.cwd(), 'database', 'pg_commerce_dev');
  assert(fs.existsSync(pgDir), 'database/pg_commerce_dev directory exists');

  const authDbPath = path.join(process.cwd(), 'database', '10q_auth_dev.db');
  assert(fs.existsSync(authDbPath), 'database/10q_auth_dev.db exists');

  const authDb = new DatabaseSync(authDbPath);
  const studentARow = authDb
    .prepare('SELECT id, email FROM users WHERE email = ?')
    .get('test.student@10qchallenge.in');
  const studentBRow = authDb
    .prepare('SELECT id, email FROM users WHERE email = ?')
    .get('student.isolation.test@example.com');
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
  await db.query(
    'DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);',
    [studentAId, studentBId]
  );
  await db.query(
    'DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);',
    [studentAId, studentBId]
  );
  await db.query(
    'DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);',
    [studentAId, studentBId]
  );
  await db.query(
    'DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);',
    [studentAId, studentBId]
  );

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

  // --- PART 3: SERVER INITIALIZATION & AUTHENTICATION ---
  console.log('\n--- 3. Spawning / Connecting to Local Server (Port 3000) ---');
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

  console.log('\n--- 4. Authenticating Test Users (Student A & Student B) ---');
  // Student A Login
  const loginARes = await probeUrl(`${BASE_URL}/api/auth/login`, {
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
  const loginBRes = await probeUrl(`${BASE_URL}/api/auth/login`, {
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

  try {
    // --- PART 5: DASHBOARD ROUTE ACCESSIBILITY ---
    console.log('\n--- 5. Dashboard Route Accessibility ---');
    const pageRes = await probeUrl(`${BASE_URL}/student/progress`, {
      headers: { Cookie: cookieA },
    });
    assert(pageRes.status === 200, 'GET /student/progress returns HTTP 200 OK');
    assert(pageRes.text.length > 500, 'GET /student/progress returned valid HTML content');

    // --- PART 6: INITIAL REAL DATA VERIFICATION ---
    console.log('\n--- 6. Initial Progress State Alignment ---');
    const initSummaryRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieA },
    });
    assert(initSummaryRes.status === 200, 'GET /api/student/progress/summary returned HTTP 200');
    assert(initSummaryRes.json?.success === true, 'Summary response success === true');
    assert(
      initSummaryRes.json?.data?.overall?.completedTopics === 0,
      'Initial completedTopics === 0 (clean state, no fake data)'
    );
    assert(
      initSummaryRes.json?.data?.overall?.averageCompletionPercentage === 0,
      'Initial averageCompletionPercentage === 0.00%'
    );
    assert(
      initSummaryRes.json?.data?.courses?.length >= 2,
      `Canonical courses listed (${initSummaryRes.json?.data?.courses?.length} courses)`
    );

    // Initial Course 1 drill-down
    const initCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieA },
    });
    assert(initCourseRes.status === 200, 'GET /api/student/progress/courses/1 returned HTTP 200');
    assert(
      initCourseRes.json?.data?.courseCompletionPercentage === 0,
      'Course 1 initial completion percentage is 0%'
    );

    // Inspect zero-topic chapter
    const subject2 = initCourseRes.json?.data?.subjects?.find((s) => s.subjectId === 2);
    assert(Boolean(subject2), 'Chemistry subject (#2) exists in Course 1');
    const zeroTopicChapter = subject2?.chapters?.find((ch) => ch.chapterId === 3);
    assert(Boolean(zeroTopicChapter), 'Physical Chemistry chapter (#3) exists in Course 1');
    assert(
      zeroTopicChapter?.totalTopics === 0,
      'Physical Chemistry has exactly 0 topics in canonical data'
    );
    assert(
      zeroTopicChapter?.completionPercentage === 0,
      'Physical Chemistry chapter completion is 0% (NOT NaN)'
    );
    assert(
      zeroTopicChapter?.isCompleted === false,
      'Physical Chemistry chapter is not completed'
    );

    // --- PART 7: INTERACTIVE TOPIC MUTATION & RECONCILIATION ---
    console.log('\n--- 7. Interactive Topic Mutation & End-to-End Reconciliation ---');

    // Find first topic in Chapter 1
    const chapter1 = initCourseRes.json?.data?.subjects?.[0]?.chapters?.[0];
    assert(Boolean(chapter1), 'Subject 1 Chapter 1 exists');
    assert(chapter1.topics && chapter1.topics.length > 0, 'Chapter 1 contains topics');
    const topicToComplete = chapter1.topics[0];
    const topicId = topicToComplete.topicId;
    assert(Boolean(topicId), `Target topic #${topicId} selected for completion`);

    // Mutation without CSRF token must fail (403 or 400)
    const noCsrfRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({
        courseId: 1,
        topicId: topicId,
        status: 'COMPLETED',
      }),
    });
    assert(
      noCsrfRes.status === 403 || noCsrfRes.status === 401,
      `Mutation without CSRF token correctly rejected with HTTP ${noCsrfRes.status}`
    );

    // Valid mutation with CSRF token
    const mutationRes = await probeUrl(`${BASE_URL}/api/student/progress/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        courseId: 1,
        topicId: topicId,
        status: 'COMPLETED',
      }),
    });
    assert(mutationRes.status === 200, 'POST /api/student/progress/topics returned HTTP 200');
    assert(mutationRes.json?.success === true, 'Mutation response success === true');
    assert(
      mutationRes.json?.data?.record?.status === 'COMPLETED',
      'Topic progress record marked as COMPLETED'
    );

    // Re-query Course 1 drill-down to verify reconciliation
    const postCourseRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieA },
    });
    assert(postCourseRes.status === 200, 'GET /api/student/progress/courses/1 re-queried');
    const updatedTopic = postCourseRes.json?.data?.subjects?.[0]?.chapters?.[0]?.topics?.find(
      (t) => t.topicId === topicId
    );
    assert(
      updatedTopic?.status === 'COMPLETED',
      `Target topic #${topicId} verified as COMPLETED in course drill-down`
    );
    assert(
      Boolean(updatedTopic?.completedAt),
      'Topic completion timestamp is recorded'
    );
    assert(
      postCourseRes.json?.data?.completedTopics >= 1,
      `Course 1 completedTopics incremented (${postCourseRes.json?.data?.completedTopics})`
    );
    assert(
      postCourseRes.json?.data?.courseCompletionPercentage > 0,
      `Course 1 completion percentage is now > 0% (${postCourseRes.json?.data?.courseCompletionPercentage.toFixed(2)}%)`
    );

    // Re-query overall summary
    const postSummaryRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieA },
    });
    assert(postSummaryRes.status === 200, 'GET /api/student/progress/summary re-queried');
    assert(
      postSummaryRes.json?.data?.overall?.completedTopics >= 1,
      `Overall summary completedTopics is now ${postSummaryRes.json?.data?.overall?.completedTopics}`
    );
    assert(
      postSummaryRes.json?.data?.overall?.averageCompletionPercentage > 0,
      `Overall summary averageCompletionPercentage is now ${postSummaryRes.json?.data?.overall?.averageCompletionPercentage.toFixed(2)}%`
    );
    assert(
      Boolean(postSummaryRes.json?.data?.overall?.lastActivityAt),
      'Overall summary lastActivityAt is populated'
    );

    // Query learning activity endpoint
    const activityRes = await probeUrl(`${BASE_URL}/api/student/progress/activity?limit=5`, {
      headers: { Cookie: cookieA },
    });
    assert(activityRes.status === 200, 'GET /api/student/progress/activity returned HTTP 200');
    const eventsList = activityRes.json?.data?.events || [];
    assert(eventsList.length >= 1, 'Activity feed contains at least 1 recorded event');
    const latestEvent = eventsList[0];
    assert(
      latestEvent?.eventType === 'TOPIC_COMPLETED',
      `Latest activity eventType is TOPIC_COMPLETED (${latestEvent?.eventType})`
    );
    assert(
      latestEvent?.topicId === topicId,
      `Latest activity references completed topic #${topicId}`
    );

    // --- PART 8: MULTI-TENANT ISOLATION (STUDENT A VS STUDENT B) ---
    console.log('\n--- 8. Multi-Tenant Student Isolation Verification ---');

    // Query Student B summary
    const summaryBRes = await probeUrl(`${BASE_URL}/api/student/progress/summary`, {
      headers: { Cookie: cookieB },
    });
    assert(summaryBRes.status === 200, 'Student B summary queried successfully');
    assert(
      summaryBRes.json?.data?.overall?.completedTopics === 0,
      'Student B has 0 completed topics (strictly isolated from Student A)'
    );
    assert(
      summaryBRes.json?.data?.overall?.averageCompletionPercentage === 0,
      'Student B has 0.00% completion'
    );
    assert(
      summaryBRes.json?.data?.recentActivity?.length === 0,
      'Student B has 0 learning events'
    );

    // Query Student B course 1 drill-down
    const courseBRes = await probeUrl(`${BASE_URL}/api/student/progress/courses/1`, {
      headers: { Cookie: cookieB },
    });
    assert(courseBRes.status === 200, 'Student B course 1 queried successfully');
    const studentBTopic = courseBRes.json?.data?.subjects?.[0]?.chapters?.[0]?.topics?.find(
      (t) => t.topicId === topicId
    );
    assert(
      studentBTopic?.status === 'NOT_STARTED',
      `Target topic #${topicId} is NOT_STARTED for Student B`
    );

    // --- PART 9: CLASSROOM ACCESS STRICT RESTRICTION GUARD ---
    console.log('\n--- 9. Classroom Access Restriction Policy Guard ---');

    // Verify enrolled courses API still enforces classroomAccessEligible: false
    const enrolledCoursesRes = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: cookieA },
    });
    assert(enrolledCoursesRes.status === 200, 'Enrolled courses API queried');
    const coursesList = enrolledCoursesRes.json?.data?.courses || [];
    for (const c of coursesList) {
      assert(
        c.classroomAccessEligible === false,
        `Course ${c.courseId} classroomAccessEligible is strictly false`
      );
    }

    // Verify limitation notices remain present
    assert(
      enrolledCoursesRes.json?.data?.limitations?.classroomEnforcement !== undefined,
      'Classroom enforcement limitation notice present in courses API'
    );
  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nShutting down spawned test server...');
      serverProcess.kill('SIGTERM');
      await wait(1500);
    }

    // Clean up test records
    try {
      db = await getCommerceDb();
      await db.query(
        'DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);',
        [studentAId, studentBId]
      );
      await db.query(
        'DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);',
        [studentAId, studentBId]
      );
      await db.query(
        'DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);',
        [studentAId, studentBId]
      );
      await db.query(
        'DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);',
        [studentAId, studentBId]
      );
      await db.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
      await db.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await closeCommerceDb();
      console.log('  ✓ Cleaned up all test records from learning schema');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.4 STAGE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFeature34Stage3Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
