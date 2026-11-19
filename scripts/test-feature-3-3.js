// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.3 AUTOMATED TEST SUITE: MY COURSES
// Multi-Tenant Isolation, PostgreSQL 16 Commerce Integration, Canonical Courses,
// All 12 Enrollment Status Edge Cases, Strict Classroom Access Restrictions,
// and Student Dashboard Alignment
// ==============================================================================

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

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

async function runFeature33Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.3 MY COURSES ENROLLMENT TESTS');
  console.log('Comprehensive Status Edge-Case, Count Definition & Isolation Suite');
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

  // --- PART 1: STORAGE & COMMERCE INTEGRITY PRE-CHECK ---
  console.log('--- 1. Storage & Commerce Integrity Pre-Check ---');
  const coursesDataPath = path.join(process.cwd(), 'data', 'courses.json');
  assert(fs.existsSync(coursesDataPath), 'data/courses.json exists in root storage');
  const pgDir = path.join(process.cwd(), 'database', 'pg_commerce_dev');
  assert(fs.existsSync(pgDir), 'database/pg_commerce_dev exists');

  // Inspect Course Master data
  const canonicalCourses = JSON.parse(fs.readFileSync(coursesDataPath, 'utf-8'));
  const course1Master = canonicalCourses.find((c) => String(c.id) === '1');
  const course2Master = canonicalCourses.find((c) => String(c.id) === '2');
  assert(Boolean(course1Master), 'Course ID 1 exists in Course Master');
  assert(Boolean(course2Master), 'Course ID 2 exists in Course Master');

  // Identify Student IDs from SQLite
  const { DatabaseSync } = require('node:sqlite');
  const authDb = new DatabaseSync(path.join(process.cwd(), 'database', '10q_auth_dev.db'));
  const studentARow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('test.student@10qchallenge.in');
  const studentBRow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('student.isolation.test@example.com');
  const studentAId = studentARow?.id || 8;
  const studentBId = studentBRow?.id || 35;
  authDb.close();
  assert(Boolean(studentAId), `Student A resolved with ID ${studentAId}`);
  assert(Boolean(studentBId), `Student B resolved with ID ${studentBId}`);

  // Seed authoritative PostgreSQL commerce test fixtures BEFORE server boots
  console.log('\n--- 1b. Seeding PostgreSQL Commerce Fixtures (All 12 Status Edge Cases) ---');
  const { PGlite } = await import('@electric-sql/pglite');
  const crypto = require('crypto');
  let initDb = new PGlite(pgDir);

  // Temporarily adjust check constraint to allow testing non-settled status rows (e.g. PROCESSING, REVERSED, etc.)
  await initDb.query('ALTER TABLE commerce.enrollments DROP CONSTRAINT IF EXISTS chk_enrollment_source_status;');
  await initDb.query('ALTER TABLE commerce.enrollments DROP CONSTRAINT IF EXISTS fk_enrollment_payment_settlement;');

  // Clean pre-existing test records
  await initDb.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await initDb.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await initDb.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
  await initDb.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  // Helper to create an order
  async function createOrder(courseId, amount, status) {
    const oId = crypto.randomUUID();
    await initDb.query(
      `INSERT INTO commerce.orders (
        id, order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
        billing_full_name, billing_email, billing_state_code, status
      ) VALUES ($1, $2, $3, $4, $5, 0.00, $5, 'Test Student', 'test.student@10qchallenge.in', 'KA', $6);`,
      [oId, `ORD-${courseId}-${Date.now()}`, studentAId, courseId, amount, status]
    );
    return oId;
  }

  // 1. SETTLED + ACTIVE (Course 1 - BITSAT)
  const o1 = await createOrder('1', 4999.00, 'PAID');
  const res1 = await initDb.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'ACTIVE') RETURNING id;`,
    [o1, studentAId]
  );
  const id1 = res1.rows[0].id;

  // 2. SETTLED + PROVISIONED (Course 2 - JEE)
  const o2 = await createOrder('2', 3999.00, 'PAID');
  const res2 = await initDb.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, $2, '2', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'PROVISIONED') RETURNING id;`,
    [o2, studentAId]
  );
  const id2 = res2.rows[0].id;

  // 3. PENDING (Course 3)
  const res3 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '3', 'PENDING', 'COMMERCE_ORDER', NOW(), 'PENDING') RETURNING id;`,
    [studentAId]
  );
  const id3 = res3.rows[0].id;

  // 4. PROCESSING (Course 4)
  const res4 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '4', 'PROCESSING', 'COMMERCE_ORDER', NOW(), 'PENDING') RETURNING id;`,
    [studentAId]
  );
  const id4 = res4.rows[0].id;

  // 5. UNVERIFIED_HISTORICAL (Course 5)
  const res5 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '5', 'UNVERIFIED_HISTORICAL', 'LEGACY_MIGRATION', NOW(), 'PROVISIONED') RETURNING id;`,
    [studentAId]
  );
  const id5 = res5.rows[0].id;

  // 6. EXPIRED (Course 6)
  const res6 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '6', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'EXPIRED') RETURNING id;`,
    [studentAId]
  );
  const id6 = res6.rows[0].id;

  // 7. REVOKED (Course 7)
  const res7 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '7', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'REVOKED') RETURNING id;`,
    [studentAId]
  );
  const id7 = res7.rows[0].id;

  // 8. SUSPENDED (Course 8)
  const res8 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '8', 'SETTLED', 'COMMERCE_ORDER', NOW(), 'SUSPENDED') RETURNING id;`,
    [studentAId]
  );
  const id8 = res8.rows[0].id;

  // 9. REVERSED (Course 9)
  const res9 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '9', 'REVERSED', 'COMMERCE_ORDER', NOW(), 'REVOKED') RETURNING id;`,
    [studentAId]
  );
  const id9 = res9.rows[0].id;

  // 10. CANCELLED (Course 10)
  const res10 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '10', 'CANCELLED', 'COMMERCE_ORDER', NOW(), 'REVOKED') RETURNING id;`,
    [studentAId]
  );
  const id10 = res10.rows[0].id;

  // 11. FAILED (Course 11)
  const res11 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '11', 'FAILED', 'COMMERCE_ORDER', NOW(), 'PENDING') RETURNING id;`,
    [studentAId]
  );
  const id11 = res11.rows[0].id;

  // 12. UNKNOWN STATUS (Course 12)
  const res12 = await initDb.query(
    `INSERT INTO commerce.enrollments (user_id, course_id, settlement_status, enrollment_source, enrolled_at, access_state)
     VALUES ($1, '12', 'UNKNOWN_STATUS_XYZ', 'COMMERCE_ORDER', NOW(), 'UNKNOWN_ACCESS') RETURNING id;`,
    [studentAId]
  );
  const id12 = res12.rows[0].id;

  // Close database to checkpoint WAL and flush data to disk
  await initDb.close();
  initDb = null;
  console.log('  ✓ Seeded 12 comprehensive enrollment status fixtures for Student A');

  // --- PART 2: SERVER LIFECYCLE ---
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

    let ready = false;
    for (let attempt = 1; attempt <= 30; attempt++) {
      await wait(1000);
      const probe = await probeUrl('http://localhost:3000/');
      if (probe.status > 0) {
        ready = true;
        console.log(`  ✓ Server reachable on attempt ${attempt}`);
        break;
      }
    }
    if (!ready) {
      console.error('  ✗ Timed out waiting for server to start.');
      if (serverProcess) serverProcess.kill('SIGTERM');
      process.exit(1);
    }
  }

  const BASE_URL = 'http://localhost:3000';

  try {
    // --- PART 3: AUTHENTICATE TEST USERS ---
    console.log('\n--- 3. Authenticating Test Users ---');
    const studentALogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(studentALogin.status === 200, 'Student A authenticated successfully');
    const studentACookie = getCookieHeader(studentALogin);
    const studentAUser = studentALogin.json?.user;

    const studentBLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(studentBLogin.status === 200, 'Student B authenticated successfully');
    const studentBCookie = getCookieHeader(studentBLogin);
    const studentBUser = studentBLogin.json?.user;

    // --- PART 4: ACCESS CONTROL & SECURITY GUARDS ---
    console.log('\n--- 4. Access Control on GET /api/student/courses ---');
    const unauthGet = await probeUrl(`${BASE_URL}/api/student/courses`);
    assert(unauthGet.status === 401, 'Unauthenticated request rejected with HTTP 401');
    assert(unauthGet.json?.success === false, 'Unauthenticated response indicates success: false');

    const fakeTokenCookie = '10q_auth_token=tampered.fake.jwt; Path=/; HttpOnly';
    const fakeAuthGet = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: fakeTokenCookie },
    });
    assert(fakeAuthGet.status === 401, 'Tampered JWT rejected with HTTP 401');

    // --- PART 5: AUTHORITATIVE ENROLLMENT RETRIEVAL & COUNT DEFINITIONS ---
    console.log('\n--- 5. Authoritative Enrollment Retrieval & Exact Count Definitions ---');
    const authGetA = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: studentACookie },
    });
    assert(authGetA.status === 200, 'Authenticated Student A receives HTTP 200');
    assert(authGetA.json?.success === true, 'Response contains success: true');
    const coursesDataA = authGetA.json?.data;
    assert(Boolean(coursesDataA), 'Response data object present');
    assert(Array.isArray(coursesDataA.courses), 'courses is an array');
    assert(typeof coursesDataA.counts === 'object', 'counts object is present');
    assert(coursesDataA.courses.length === 12, `Student A has exactly 12 enrollment records (found ${coursesDataA.courses.length})`);

    // Verification of count definitions
    assert(coursesDataA.counts.totalEnrollments === 12, 'totalEnrollments = 12 total records');
    assert(coursesDataA.counts.settledCount === 2, 'settledCount = 2 (Settled Active + Settled Provisioned)');
    assert(coursesDataA.counts.pendingCount === 2, 'pendingCount = 2 (PENDING + PROCESSING)');
    assert(coursesDataA.counts.revokedCount === 5, 'revokedCount = 5 (REVOKED + SUSPENDED + REVERSED + CANCELLED + FAILED)');

    // --- PART 6: MULTI-TENANT ISOLATION & QUERY SCOPE SECURITY ---
    console.log('\n--- 6. Multi-Tenant Student Isolation & Query Scope Security ---');
    const spoofQuery = await probeUrl(`${BASE_URL}/api/student/courses?userId=${studentBUser.id}`, {
      headers: { Cookie: studentACookie },
    });
    assert(spoofQuery.status === 200, 'Request with spoof query param returns 200');
    assert(
      JSON.stringify(spoofQuery.json?.data) === JSON.stringify(coursesDataA),
      'Client-supplied userId query parameter ignored; scoped strictly to authenticated session'
    );

    const authGetB = await probeUrl(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: studentBCookie },
    });
    assert(authGetB.status === 200, 'Student B retrieves own course library (HTTP 200)');
    const coursesDataB = authGetB.json?.data;
    assert(Boolean(coursesDataB), 'Student B course data present');
    assert(coursesDataB.courses.length === 0, 'Student B has 0 courses (clean tenant separation)');

    const aEnrollIds = coursesDataA.courses.map((c) => c.enrollmentId);
    const bEnrollIds = coursesDataB.courses.map((c) => c.enrollmentId);
    const overlap = aEnrollIds.filter((id) => bEnrollIds.includes(id));
    assert(overlap.length === 0, 'Zero cross-student enrollment ID leakage');

    // --- PART 7: VERIFY ALL 12 ENROLLMENT STATES ---
    console.log('\n--- 7. Systematic Verification of All 12 Enrollment States ---');

    function verifyCourseState(courseId, expected) {
      const c = coursesDataA.courses.find((item) => item.courseId === courseId);
      assert(Boolean(c), `Course ${courseId} (${expected.name}) found in response`);
      assert(c?.statusCategory === expected.statusCategory, `[${expected.name}] statusCategory is ${expected.statusCategory} (got ${c?.statusCategory})`);
      assert(c?.statusLabel === expected.statusLabel, `[${expected.name}] statusLabel is "${expected.statusLabel}" (got "${c?.statusLabel}")`);
      assert(c?.classroomAccessEligible === false, `[${expected.name}] classroomAccessEligible is strictly false`);
      assert(c?.classroomStatusNotice.includes('Classroom access will be available once access provisioning is enabled'), `[${expected.name}] notice matches locked policy`);
      assert(c?.progress === undefined, `[${expected.name}] Zero fabricated progress percentage`);
      if (expected.isUnknown) {
        assert(c?.statusCategory !== 'ACTIVE', `[${expected.name}] Unknown status is NEVER treated as ACTIVE`);
      }
    }

    // 1. SETTLED + ACTIVE
    verifyCourseState('1', {
      name: 'SETTLED + ACTIVE',
      statusCategory: 'ACTIVE',
      statusLabel: 'Enrolled (Active)',
    });

    // 2. SETTLED + PROVISIONED
    verifyCourseState('2', {
      name: 'SETTLED + PROVISIONED',
      statusCategory: 'PROVISIONING',
      statusLabel: 'Access Provisioning Pending',
    });

    // 3. PENDING
    verifyCourseState('3', {
      name: 'PENDING',
      statusCategory: 'PENDING',
      statusLabel: 'Payment Settlement Pending',
    });

    // 4. PROCESSING
    verifyCourseState('4', {
      name: 'PROCESSING',
      statusCategory: 'PENDING',
      statusLabel: 'Payment Processing',
    });

    // 5. UNVERIFIED_HISTORICAL
    verifyCourseState('5', {
      name: 'UNVERIFIED_HISTORICAL',
      statusCategory: 'UNVERIFIED',
      statusLabel: 'Historical Verification Pending',
    });

    // 6. EXPIRED
    verifyCourseState('6', {
      name: 'EXPIRED',
      statusCategory: 'EXPIRED',
      statusLabel: 'Enrollment Expired',
    });

    // 7. REVOKED
    verifyCourseState('7', {
      name: 'REVOKED',
      statusCategory: 'REVOKED',
      statusLabel: 'Access Revoked',
    });

    // 8. SUSPENDED
    verifyCourseState('8', {
      name: 'SUSPENDED',
      statusCategory: 'REVOKED',
      statusLabel: 'Access Suspended',
    });

    // 9. REVERSED
    verifyCourseState('9', {
      name: 'REVERSED',
      statusCategory: 'REVOKED',
      statusLabel: 'Payment Reversed',
    });

    // 10. CANCELLED
    verifyCourseState('10', {
      name: 'CANCELLED',
      statusCategory: 'REVOKED',
      statusLabel: 'Order Cancelled',
    });

    // 11. FAILED
    verifyCourseState('11', {
      name: 'FAILED',
      statusCategory: 'REVOKED',
      statusLabel: 'Payment Failed',
    });

    // 12. UNKNOWN SETTLEMENT / ACCESS
    verifyCourseState('12', {
      name: 'UNKNOWN STATUS',
      statusCategory: 'UNKNOWN',
      statusLabel: 'Unknown Status',
      isUnknown: true,
    });

    // --- PART 8: CANONICAL COURSE MASTER CONSISTENCY & SAFE FALLBACKS ---
    console.log('\n--- 8. Canonical Course Master Consistency & Safe Metadata Fallbacks ---');
    const course1 = coursesDataA.courses.find((c) => c.courseId === '1');
    assert(course1.title === course1Master.title, 'Course 1 title matches Course Master');
    assert(course1.slug === course1Master.slug, 'Course 1 slug matches Course Master');
    assert(course1.examTag === course1Master.exam, 'Course 1 examTag matches Course Master');
    assert(course1.image === course1Master.image || course1.image === course1Master.bannerImage, 'Course 1 image matches Course Master');
    assert(course1.courseDetailsUrl === `/course/${course1Master.slug}`, 'Course 1 links to /course/bitsat-2026-master-crash-course');

    const course2 = coursesDataA.courses.find((c) => c.courseId === '2');
    assert(course2.title === course2Master.title, 'Course 2 title matches Course Master');
    assert(course2.slug === course2Master.slug, 'Course 2 slug matches Course Master');
    assert(course2.examTag === course2Master.exam, 'Course 2 examTag matches Course Master');
    assert(course2.courseDetailsUrl === `/course/${course2Master.slug}`, 'Course 2 links to /course/jee-main-2026-rank-booster-batch');

    // Missing Course Metadata Fallback (e.g. Course 12 not in Course Master)
    const course12 = coursesDataA.courses.find((c) => c.courseId === '12');
    assert(course12.title === 'Course #12', 'Missing course title safely falls back to "Course #12"');
    assert(course12.slug === '12', 'Missing course slug safely falls back to "12"');
    assert(course12.examTag === 'General', 'Missing course examTag safely falls back to "General"');
    assert(course12.image === null, 'Missing course image safely defaults to null');
    assert(course12.courseDetailsUrl === '/course-all', 'Missing course action safely points to catalog /course-all');

    // --- PART 9: DASHBOARD ALIGNMENT & RECONCILIATION ---
    console.log('\n--- 9. Dashboard Integration & Reconciliation with Feature 3.1 ---');
    const dashRes = await probeUrl(`${BASE_URL}/api/student/dashboard`, {
      headers: { Cookie: studentACookie },
    });
    assert(dashRes.status === 200, 'Student dashboard queried successfully');
    const dashOverviewCount = dashRes.json?.data?.overview?.enrolledCoursesCount;
    const dashCoursesCount = dashRes.json?.data?.courses?.enrolledCount;
    assert(
      dashOverviewCount === coursesDataA.counts.settledCount,
      `Dashboard overview count (${dashOverviewCount}) matches My Courses settledCount (${coursesDataA.counts.settledCount})`
    );
    assert(
      dashCoursesCount === coursesDataA.counts.settledCount,
      `Dashboard courses enrolledCount (${dashCoursesCount}) matches My Courses settledCount (${coursesDataA.counts.settledCount})`
    );

    // --- PART 10: FRONTEND ROUTE & NAVIGATION PROBING ---
    console.log('\n--- 10. Frontend Route & Navigation Probing ---');
    const myCoursesPageProbe = await probeUrl(`${BASE_URL}/student/courses`, {
      headers: { Cookie: studentACookie },
    });
    assert(myCoursesPageProbe.status === 200, 'GET /student/courses returns HTTP 200 OK');

    const myCoursesPageSource = fs.readFileSync(
      path.join(process.cwd(), 'frontend', 'app', '(student)', 'student', 'courses', 'page.tsx'),
      'utf-8'
    );
    assert(myCoursesPageSource.includes('/api/student/courses'), 'Page fetches authoritative /api/student/courses');
    assert(myCoursesPageSource.includes('My Enrolled Courses'), 'Page contains "My Enrolled Courses" header');
    assert(
      myCoursesPageSource.includes('Explore Course Catalog') || myCoursesPageSource.includes('course-all'),
      'Page contains empty-state link to course catalog'
    );
    assert(
      myCoursesPageSource.includes('Classroom access will be available once access provisioning is enabled') ||
        myCoursesPageSource.includes('classroomStatusNotice'),
      'Page displays authoritative classroom notice box'
    );
    assert(!myCoursesPageSource.includes('45%'), 'Page contains no fabricated "45%" progress mockup');
    assert(!myCoursesPageSource.includes('Enter Classroom'), 'Page does not expose premature "Enter Classroom" action');

    const sidebarSource = fs.readFileSync(
      path.join(process.cwd(), 'frontend', 'components', 'student', 'StudentSidebar.tsx'),
      'utf-8'
    );
    assert(sidebarSource.includes('/student/courses'), 'Sidebar links to /student/courses');
    assert(sidebarSource.includes('My Enrolled Courses'), 'Sidebar contains "My Enrolled Courses" nav item');
  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nShutting down spawned test server...');
      serverProcess.kill('SIGTERM');
      await wait(1500);
    }

    // Clean up all test fixtures from PostgreSQL and restore original schema constraints
    try {
      const cleanDb = new PGlite(pgDir);
      await cleanDb.query('DELETE FROM commerce.enrollments WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
      await cleanDb.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
      await cleanDb.query('DELETE FROM commerce.payment_attempts WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id IN ($1, $2));', [studentAId, studentBId]);
      await cleanDb.query('DELETE FROM commerce.orders WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

      // Re-apply original check constraints and foreign keys
      await cleanDb.query(`
        ALTER TABLE commerce.enrollments ADD CONSTRAINT chk_enrollment_source_status CHECK (
          (enrollment_source IN ('COMMERCE_ORDER', 'INTERNAL_FREE_GRANT') AND settlement_status = 'SETTLED' AND order_id IS NOT NULL)
          OR (enrollment_source = 'LEGACY_MIGRATION' AND settlement_status = 'UNVERIFIED_HISTORICAL')
          OR (enrollment_source = 'MANUAL_REVIEW_QUARANTINE' AND settlement_status = 'UNVERIFIED_HISTORICAL')
        );
      `);
      await cleanDb.query(`
        ALTER TABLE commerce.enrollments ADD CONSTRAINT fk_enrollment_payment_settlement 
        FOREIGN KEY (order_id, settlement_status) REFERENCES commerce.payments(order_id, settlement_status) ON DELETE RESTRICT;
      `);

      await cleanDb.close();
      console.log('  ✓ Cleaned up all test records and restored original PostgreSQL constraints');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFeature33Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
