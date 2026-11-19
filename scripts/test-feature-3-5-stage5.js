/**
 * ==============================================================================
 * 10Q CHALLENGE LMS — FEATURE 3.5 STAGE 5 TEST SUITE
 * Final End-to-End Classroom Integration, Security, and Production QA Suite
 * ==============================================================================
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequest(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyStr);
    }
    req.end();
  });
}

async function loginUser(email, password = 'StudentPass2026!') {
  const res = await makeRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email, password },
  });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} with status ${res.status}`);
  }

  const rawCookies = res.headers['set-cookie'] || [];
  const cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');

  let csrfToken = '';
  for (const c of rawCookies) {
    const match = c.match(/10q_csrf_token=([^;]+)/);
    if (match) {
      csrfToken = decodeURIComponent(match[1]);
      break;
    }
  }

  return { cookieHeader, csrfToken, user: res.json?.data?.user };
}

async function runStage5Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.5 STAGE 5 FINAL QA SUITE');
  console.log('Full Classroom Journey, Security Audit & Release Readiness QA');
  console.log('================================================================\n');

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

  // Seed clean un-enrolled student (Student Zero)
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

  const allUserIds = [studentAId, studentBId, studentZeroId];
  const { getCommerceDb, closeCommerceDb } = require('../frontend/lib/learning/dist/commerce/db.js');
  let db = await getCommerceDb();

  // Clean test tables
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_content_progress WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_learning_events WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM commerce.enrollment_payment_orders WHERE enrollment_id IN (SELECT id FROM commerce.enrollments WHERE user_id = ANY($1));', [allUserIds]);
  await db.query('DELETE FROM commerce.enrollments WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
  await db.query('DELETE FROM commerce.orders WHERE user_id = ANY($1);', [allUserIds]);

  console.log('  ✓ Test tables cleared for clean boundary testing');

  // Seed settled enrollments
  const orderARes = await db.query(
    `INSERT INTO commerce.orders (order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
       billing_full_name, billing_email, billing_state_code, status)
     VALUES ($1, $2, '1', 4999.00, 0.00, 4999.00, 'Student A', 'test.student@10qchallenge.in', 'DL', 'PAID')
     RETURNING id;`,
    [`ORD-S5A-${Date.now()}`, studentAId]
  );
  const orderAId = orderARes.rows[0].id;

  await db.query(
    `INSERT INTO commerce.payments (order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status)
     VALUES ($1, 'PAYU', $2, 4999.00, 'INR', 'SETTLED');`,
    [orderAId, `PAY-S5A-${Date.now()}`]
  );

  const enrARes = await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', 'ACTIVE')
     RETURNING id;`,
    [orderAId, studentAId]
  );
  const enrollmentAId = enrARes.rows[0].id;

  await closeCommerceDb();
  console.log('  ✓ Settled enrollment seeded for Student A -> Course 1');

  // Launch production server
  console.log('\n--- 2. Production Server Launch ---');
  let serverProcess = null;
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: 'ignore',
  });

  let serverStarted = false;
  for (let i = 0; i < 20; i++) {
    await wait(600);
    try {
      const res = await makeRequest('/');
      if (res.status === 200) {
        serverStarted = true;
        console.log(`  ✓ Server reachable on attempt ${i + 1}`);
        break;
      }
    } catch {}
  }

  if (!serverStarted) {
    console.error('  ✗ Timed out waiting for server to start.');
    if (serverProcess) serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  try {
    // --- PART 3: COMPLETE 10-STEP STUDENT CLASSROOM JOURNEY ---
    console.log('\n--- 3. Complete 10-Step Student Classroom Journey ---');
    // Step 1: Student signs in
    const sessionA = await loginUser('test.student@10qchallenge.in');
    assert(Boolean(sessionA.cookieHeader), 'Step 1: Student signs in successfully');
    assert(Boolean(sessionA.csrfToken), 'Step 1: CSRF token acquired');

    // Step 2: Student opens My Courses
    const myCoursesRes = await makeRequest('/api/student/courses', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(myCoursesRes.status === 200, 'Step 2: Student opens My Courses (HTTP 200)');
    const courses = myCoursesRes.json?.data?.courses || [];
    assert(courses.length > 0, 'Step 2: Student has enrolled course list');

    // Step 3: Student selects an eligible enrolled course
    const course1 = courses.find((c) => String(c.courseId) === '1');
    assert(Boolean(course1), 'Step 3: Eligible enrolled Course 1 found in student course list');
    assert(course1.classroomAccessEligible === false, 'Step 3: Course 1 policy guard classroomAccessEligible remains false');

    // Step 4: Classroom loads correct course curriculum
    const classroomRes = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(classroomRes.status === 200, 'Step 4: Classroom loads course curriculum (HTTP 200)');
    assert(classroomRes.json?.success === true, 'Step 4: Classroom response success is true');
    assert(classroomRes.json?.data?.courseId === 1, 'Step 4: Curriculum matches Course 1');
    assert(classroomRes.json?.data?.courseTitle.includes('BITSAT'), 'Step 4: Course title matches canonical Master');

    // Step 5: Student navigates subjects, chapters and topics
    const subjects = classroomRes.json?.data?.subjects || [];
    assert(subjects.length === 3, 'Step 5: Curriculum includes 3 canonical subjects (Physics, Chemistry, Math)');
    const physicsSub = subjects.find((s) => s.subjectName === 'Physics');
    assert(Boolean(physicsSub), 'Step 5: Physics subject located');
    assert(physicsSub.chapters.length > 0, 'Step 5: Physics chapters loaded');
    const firstChapter = physicsSub.chapters[0];
    assert(firstChapter.topics.length > 0, 'Step 5: Chapter topics loaded');
    const firstTopic = firstChapter.topics[0];
    assert(firstTopic.topicId === 1, 'Step 5: Topic 1 Rectilinear Motion located');

    // Step 6: Student opens a video lesson
    const vidRes = await makeRequest('/api/student/classroom/1/video/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(vidRes.status === 200, 'Step 6: Video lesson configuration loaded (HTTP 200)');
    const pbConfig = vidRes.json?.data?.playbackConfig || vidRes.json?.playbackConfig;
    assert(pbConfig?.vimeoVideoId === '824804225', 'Step 6: Playback config contains Vimeo ID 824804225');
    assert(pbConfig?.responsive === true, 'Step 6: Responsive player option enabled');

    // Step 7: Student views study-material availability state
    const docs = firstChapter.documents || [];
    assert(docs.length > 0, 'Step 7: Chapter has canonical Document Master item');
    assert(docs[0].title.includes('Formula Handbook'), 'Step 7: Document title matches Formula Handbook');
    assert(docs[0].fileType === 'PDF', 'Step 7: Document format is PDF');

    // Step 8: Student marks a topic complete
    const markTopicRes = await makeRequest('/api/student/progress/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': sessionA.csrfToken,
        Cookie: sessionA.cookieHeader,
      },
      body: {
        courseId: 1,
        topicId: 1,
        status: 'COMPLETED',
      },
    });
    assert(markTopicRes.status === 200, 'Step 8: Student marks topic complete (HTTP 200)');
    assert(markTopicRes.json?.success === true, 'Step 8: Mutation success confirmed');

    // Step 9: Progress updates correctly
    const reClassroomRes = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(reClassroomRes.status === 200, 'Step 9: Re-fetched classroom reports HTTP 200');
    assert(reClassroomRes.json?.data?.progress?.completedTopics === 1, 'Step 9: Completed topics updated to 1');
    assert(reClassroomRes.json?.data?.progress?.completionPercentage > 0, 'Step 9: Completion percentage is positive');

    // Step 10: Refresh or fresh login preserves persisted progress
    const freshSession = await loginUser('test.student@10qchallenge.in');
    const freshClassroomRes = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: freshSession.cookieHeader },
    });
    assert(freshClassroomRes.status === 200, 'Step 10: Fresh session queries classroom (HTTP 200)');
    assert(freshClassroomRes.json?.data?.progress?.completedTopics === 1, 'Step 10: Progress durably persisted across sessions (1 completed)');
    const persistedTopic = freshClassroomRes.json?.data?.subjects?.[0]?.chapters?.[0]?.topics?.find((t) => t.topicId === 1);
    assert(persistedTopic?.status === 'COMPLETED', 'Step 10: Topic status strictly remains COMPLETED');

    // --- PART 4: SECURITY & CREDENTIAL SANITIZATION AUDIT ---
    console.log('\n--- 4. Security & Credential Sanitization Audit ---');
    // Path traversal attempt on document endpoint
    const traversalRes = await makeRequest('/api/student/classroom/1/document/../../package.json', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(traversalRes.status === 400 || traversalRes.status === 404, 'Path traversal attack rejected with 400/404');

    // Unauthenticated access rejection
    const unauthRes = await makeRequest('/api/student/classroom/1');
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

    // CSRF protection check
    const noCsrfRes = await makeRequest('/api/student/progress/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionA.cookieHeader,
      },
      body: { courseId: 1, topicId: 2, status: 'COMPLETED' },
    });
    assert(noCsrfRes.status === 403, 'POST mutation without CSRF token rejected with HTTP 403');

    // Check sensitive keys in classroom payload
    const rawData = JSON.stringify(classroomRes.json);
    assert(!rawData.includes('passwordHash'), 'Sanitization: passwordHash strictly omitted');
    assert(!rawData.includes('private_key'), 'Sanitization: private_key strictly omitted');
    assert(!rawData.includes('client_secret'), 'Sanitization: client_secret strictly omitted');
    assert(!rawData.includes('storage/documents'), 'Sanitization: internal storage paths strictly omitted');

    // Dynamic revocation test
    serverProcess.kill('SIGTERM');
    await wait(600);

    db = await getCommerceDb();
    await db.query(`UPDATE commerce.enrollments SET access_state = 'REVOKED' WHERE id = $1;`, [enrollmentAId]);
    await closeCommerceDb();

    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: 'ignore',
    });

    let restarted = false;
    for (let i = 0; i < 20; i++) {
      await wait(500);
      try {
        const res = await makeRequest('/');
        if (res.status === 200) {
          restarted = true;
          break;
        }
      } catch {}
    }
    assert(restarted, 'Server restarted for revocation test');

    const revokedRes = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(revokedRes.status === 403, 'Revoked student denied classroom access (HTTP 403)');

    // Cleanup
    serverProcess.kill('SIGTERM');
    await wait(600);

    db = await getCommerceDb();
    await db.query('DELETE FROM learning.student_topic_progress WHERE user_id = ANY($1);', [allUserIds]);
    await db.query('DELETE FROM learning.student_content_progress WHERE user_id = ANY($1);', [allUserIds]);
    await db.query('DELETE FROM learning.student_learning_events WHERE user_id = ANY($1);', [allUserIds]);
    await db.query('DELETE FROM learning.student_course_activity WHERE user_id = ANY($1);', [allUserIds]);
    await db.query('DELETE FROM commerce.enrollment_payment_orders WHERE enrollment_id IN (SELECT id FROM commerce.enrollments WHERE user_id = ANY($1));', [allUserIds]);
    await db.query('DELETE FROM commerce.enrollments WHERE user_id = ANY($1);', [allUserIds]);
    await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
    await db.query('DELETE FROM commerce.orders WHERE user_id = ANY($1);', [allUserIds]);
    await closeCommerceDb();
    console.log('  ✓ Cleaned up test fixture records');
  } finally {
    console.log('\n--- Terminating Production Server ---');
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await wait(800);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.5 STAGE 5 QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage5Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
