/**
 * ==============================================================================
 * 10Q CHALLENGE LMS — FEATURE 3.5 STAGE 4 TEST SUITE
 * Classroom UI & Player Integration QA & Access Boundary Verification
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

async function runStage4Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.5 STAGE 4 TEST SUITE');
  console.log('Classroom UI, Player Integration & Learning Progress QA');
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

  // Clear previous test records for clean testing
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_content_progress WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_learning_events WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM commerce.enrollment_payment_orders WHERE enrollment_id IN (SELECT id FROM commerce.enrollments WHERE user_id = ANY($1));', [allUserIds]);
  await db.query('DELETE FROM commerce.enrollments WHERE user_id = ANY($1);', [allUserIds]);
  await db.query('DELETE FROM commerce.payments WHERE order_id IN (SELECT id FROM commerce.orders WHERE user_id = ANY($1));', [allUserIds]);
  await db.query('DELETE FROM commerce.orders WHERE user_id = ANY($1);', [allUserIds]);

  console.log('  ✓ Test tables cleared for clean boundary testing');

  // --- PART 2: SEEDING SETTLED COMMERCE ENROLLMENTS ---
  console.log('\n--- 2. Seeding Settled Enrollments for Students ---');
  // Student A -> Enrolled in Course 1
  const orderARes = await db.query(
    `INSERT INTO commerce.orders (order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
       billing_full_name, billing_email, billing_state_code, status)
     VALUES ($1, $2, '1', 4999.00, 0.00, 4999.00, 'Student A', 'test.student@10qchallenge.in', 'DL', 'PAID')
     RETURNING id;`,
    [`ORD-S4A-${Date.now()}`, studentAId]
  );
  const orderAId = orderARes.rows[0].id;

  await db.query(
    `INSERT INTO commerce.payments (order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status)
     VALUES ($1, 'PAYU', $2, 4999.00, 'INR', 'SETTLED');`,
    [orderAId, `PAY-S4A-${Date.now()}`]
  );

  const enrARes = await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, access_state)
     VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', 'ACTIVE')
     RETURNING id;`,
    [orderAId, studentAId]
  );
  const enrollmentAId = enrARes.rows[0].id;

  // Student B -> Enrolled in Course 2
  const orderBRes = await db.query(
    `INSERT INTO commerce.orders (order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
       billing_full_name, billing_email, billing_state_code, status)
     VALUES ($1, $2, '2', 2999.00, 0.00, 2999.00, 'Student B', 'student.isolation.test@example.com', 'MH', 'PAID')
     RETURNING id;`,
    [`ORD-S4B-${Date.now()}`, studentBId]
  );
  const orderBId = orderBRes.rows[0].id;

  await db.query(
    `INSERT INTO commerce.payments (order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status)
     VALUES ($1, 'PAYU', $2, 2999.00, 'INR', 'SETTLED');`,
    [orderBId, `PAY-S4B-${Date.now()}`]
  );

  await db.query(
    `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, access_state)
     VALUES ($1, $2, '2', 'SETTLED', 'COMMERCE_ORDER', 'ACTIVE');`,
    [orderBId, studentBId]
  );

  await closeCommerceDb();
  console.log('  ✓ Settled enrollments seeded: Student A -> Course 1, Student B -> Course 2, Student Zero -> None');

  // --- PART 3: PRODUCTION SERVER LAUNCH ---
  console.log('\n--- 3. Production Server Launch ---');
  let serverProcess = null;
  console.log('  Starting server via node server.js...');
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
    // --- PART 4: AUTHENTICATE TEST SESSIONS ---
    console.log('\n--- 4. Authenticating Test Sessions ---');
    const sessionA = await loginUser('test.student@10qchallenge.in');
    const sessionB = await loginUser('student.isolation.test@example.com');
    const sessionZero = await loginUser('student.zero.enrollment@example.com');
    assert(Boolean(sessionA.cookieHeader), 'Student A authenticated successfully');
    assert(Boolean(sessionB.cookieHeader), 'Student B authenticated successfully');
    assert(Boolean(sessionZero.cookieHeader), 'Student Zero authenticated successfully');

    // --- PART 5: CLASSROOM ROUTE SSR & CLIENT MOUNT ---
    console.log('\n--- 5. Classroom Page SSR HTML & Structure Verification ---');
    const pageRes = await makeRequest('/student/courses/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(pageRes.status === 200, 'Classroom page /student/courses/1 renders HTTP 200');
    assert(pageRes.data.includes('Course Syllabus') || pageRes.data.includes('Classroom') || pageRes.data.includes('Loading'), 'Page HTML serves Classroom App Shell');

    // --- PART 6: MULTI-TENANT ACCESS CONTROL & ENROLLMENT BOUNDARIES ---
    console.log('\n--- 6. Multi-Tenant Access Control & Enrollment Boundaries ---');
    // Unauthenticated request
    const unauthClassroom = await makeRequest('/api/student/classroom/1');
    assert(unauthClassroom.status === 401, 'Unauthenticated user rejected with HTTP 401');

    // Student Zero (No Enrollment) -> Denied
    const studentZeroClassroom = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionZero.cookieHeader },
    });
    assert(studentZeroClassroom.status === 403, 'Student Zero denied access to Course 1 (HTTP 403)');
    assert(studentZeroClassroom.json?.error?.includes('Forbidden'), 'Error explicitly communicates Forbidden enrollment');

    // Student A (Enrolled in Course 1) -> Allowed for Course 1
    const studentAClassroom = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(studentAClassroom.status === 200, 'Student A authorized for enrolled Course 1 (HTTP 200)');
    assert(studentAClassroom.json?.success === true, 'Response success is true');
    assert(studentAClassroom.json?.data?.courseId === 1, 'Classroom data belongs to Course 1');
    assert(Array.isArray(studentAClassroom.json?.data?.subjects), 'Subjects array is present');
    assert(studentAClassroom.json?.data?.subjects.length > 0, 'Classroom includes canonical subjects');

    // Student A -> Denied for non-enrolled Course 2
    const studentACourse2 = await makeRequest('/api/student/classroom/2', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(studentACourse2.status === 403, 'Student A denied for non-enrolled Course 2 (HTTP 403)');
    assert(studentACourse2.json?.error?.includes('Forbidden'), 'Error explicitly mentions Forbidden enrollment');

    // Student B -> Authorized for Course 2, Denied for Course 1
    const studentBCourse2 = await makeRequest('/api/student/classroom/2', {
      headers: { Cookie: sessionB.cookieHeader },
    });
    assert(studentBCourse2.status === 200, 'Student B authorized for enrolled Course 2 (HTTP 200)');

    const studentBCourse1 = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionB.cookieHeader },
    });
    assert(studentBCourse1.status === 403, 'Student B denied for non-enrolled Course 1 (HTTP 403)');

    // --- PART 7: CRITICAL VIMEO RESTRICTION & PLAYBACK INTEGRATION ---
    console.log('\n--- 7. Vimeo Video Integration & Unavailable State Verification ---');
    // Fetch video 1 config (sample ID 824804225)
    const vid1Res = await makeRequest('/api/student/classroom/1/video/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(vid1Res.status === 200, 'Student A receives HTTP 200 for Video 1 configuration');
    const pbConfig = vid1Res.json?.data?.playbackConfig || vid1Res.json?.playbackConfig;
    assert(pbConfig?.vimeoVideoId === '824804225', 'Video 1 returns sample Vimeo ID 824804225');
    assert(pbConfig?.responsive === true, 'Playback config sets responsive: true');
    assert(pbConfig?.dnt === true, 'Playback config sets dnt: true');
    assert(pbConfig?.color === '3F328A', 'Playback config sets brand color 3F328A');

    // Cross-course video isolation
    const vidCrossCourse = await makeRequest('/api/student/classroom/1/video/3', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(vidCrossCourse.status === 404 || vidCrossCourse.status === 403, 'Cross-course video request strictly rejected (404/403)');

    // Non-enrolled video access
    const vidUnenrolled = await makeRequest('/api/student/classroom/2/video/3', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(vidUnenrolled.status === 403, 'Non-enrolled video request strictly rejected with 403');

    // --- PART 8: CRITICAL PDF RESTRICTION VERIFICATION ---
    console.log('\n--- 8. Critical PDF Restriction & Coming Soon State Verification ---');
    // Check that Document Master metadata is present in classroom curriculum
    const firstSubject = studentAClassroom.json?.data?.subjects?.[0];
    const firstChapter = firstSubject?.chapters?.[0];
    const docs = firstChapter?.documents || [];
    assert(docs.length > 0, 'Classroom chapter includes canonical Document Master items');
    assert(docs[0].id === 1, 'Document ID 1 present in chapter documents');
    assert(docs[0].title.includes('Formula Handbook'), 'Document title matches canonical title');
    assert(docs[0].fileType === 'PDF', 'Document file type is PDF');

    // Direct fetch of document stream via API requires enrollment (tested in Stage 3)
    const docStreamRes = await makeRequest('/api/student/classroom/1/document/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(docStreamRes.status === 200, 'Backend Document stream endpoint delivers bytes for enrolled student');
    assert(docStreamRes.headers['content-type'] === 'application/pdf', 'MIME type is application/pdf');

    // Unenrolled document attempt
    const docUnenrolled = await makeRequest('/api/student/classroom/2/document/2', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(docUnenrolled.status === 403, 'Unenrolled student blocked from document endpoint (HTTP 403)');

    // --- PART 9: PROGRESS INTEGRATION & MUTATIONS ---
    console.log('\n--- 9. Student Learning Progress Integration & Mutation Flow ---');
    // Initial completion check
    assert(studentAClassroom.json?.data?.progress?.completedTopics === 0, 'Initial completed topics is 0');
    assert(studentAClassroom.json?.data?.progress?.completionPercentage === 0, 'Initial completion percentage is 0.0%');

    // Mark Topic 1 COMPLETED
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
    assert(markTopicRes.status === 200, 'POST /api/student/progress/topics returned HTTP 200');
    assert(markTopicRes.json?.success === true, 'Topic mutation success is true');
    const topicStatus = markTopicRes.json?.data?.record?.status || markTopicRes.json?.data?.status;
    assert(topicStatus === 'COMPLETED', 'Topic status is COMPLETED');

    // Mark Video 1 COMPLETED
    const markVidRes = await makeRequest('/api/student/progress/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': sessionA.csrfToken,
        Cookie: sessionA.cookieHeader,
      },
      body: {
        courseId: 1,
        contentType: 'VIDEO',
        contentIdentifier: '1',
        status: 'COMPLETED',
      },
    });
    assert(markVidRes.status === 200, 'POST /api/student/progress/content returned HTTP 200');
    assert(markVidRes.json?.success === true, 'Video mutation success is true');

    // Re-query Classroom API to verify authoritative server-side calculation
    const refreshedClassroom = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(refreshedClassroom.status === 200, 'Refreshed Classroom API returns HTTP 200');
    assert(refreshedClassroom.json?.data?.progress?.completedTopics === 1, 'Authoritative completed topics incremented to 1');
    assert(refreshedClassroom.json?.data?.progress?.completionPercentage > 0, 'Authoritative completion percentage updated to positive value');
    assert(refreshedClassroom.json?.data?.progress?.completedVideos === 1, 'Authoritative completed videos incremented to 1');

    // Check specific topic status in hierarchy
    const updatedSub = refreshedClassroom.json?.data?.subjects?.[0];
    const updatedChap = updatedSub?.chapters?.[0];
    const updatedTopic = updatedChap?.topics?.find((t) => t.topicId === 1);
    assert(updatedTopic?.status === 'COMPLETED', 'Topic #1 in hierarchy reflects COMPLETED status');
    assert(Boolean(updatedTopic?.completedAt), 'Topic #1 has valid completedAt timestamp');

    // --- PART 10: PROGRESS IDEMPOTENCY & DOWNGRADE PREVENTION ---
    console.log('\n--- 10. Progress Idempotency & Downgrade Prevention ---');
    // Attempt to submit IN_PROGRESS for already completed topic
    const staleMutationRes = await makeRequest('/api/student/progress/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': sessionA.csrfToken,
        Cookie: sessionA.cookieHeader,
      },
      body: {
        courseId: 1,
        topicId: 1,
        status: 'IN_PROGRESS',
      },
    });
    assert(staleMutationRes.status === 200, 'Stale mutation processed safely with HTTP 200');

    // Verify status remained COMPLETED
    const checkStatusRes = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    const preservedTopic = checkStatusRes.json?.data?.subjects?.[0]?.chapters?.[0]?.topics?.find((t) => t.topicId === 1);
    assert(preservedTopic?.status === 'COMPLETED', 'Topic #1 status strictly preserved as COMPLETED (Downgrade prevented)');

    // --- PART 11: DYNAMIC ENROLLMENT REVOCATION ENFORCEMENT ---
    console.log('\n--- 11. Dynamic Enrollment Revocation Enforcement ---');
    // Stop server to flush in-process DB
    serverProcess.kill('SIGTERM');
    await wait(600);

    // Update Student A enrollment to REVOKED in PostgreSQL
    db = await getCommerceDb();
    await db.query(`UPDATE commerce.enrollments SET access_state = 'REVOKED' WHERE id = $1;`, [enrollmentAId]);
    await closeCommerceDb();
    console.log('  ✓ Updated Student A enrollment access_state to REVOKED in PostgreSQL');

    // Restart server
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
    assert(restarted, 'Server restarted successfully with revoked enrollment state');

    // Subsequent classroom requests must immediately return 403 Forbidden
    const revokedClassroom = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(revokedClassroom.status === 403, 'Revoked student immediately denied classroom curriculum (HTTP 403)');

    const revokedVideo = await makeRequest('/api/student/classroom/1/video/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(revokedVideo.status === 403, 'Revoked student immediately denied video playback config (HTTP 403)');

    const revokedDoc = await makeRequest('/api/student/classroom/1/document/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(revokedDoc.status === 403, 'Revoked student immediately denied document stream (HTTP 403)');

    // Stop server, restore enrollment to ACTIVE, and restart
    serverProcess.kill('SIGTERM');
    await wait(600);

    db = await getCommerceDb();
    await db.query(`UPDATE commerce.enrollments SET access_state = 'ACTIVE' WHERE id = $1;`, [enrollmentAId]);
    await closeCommerceDb();

    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: 'ignore',
    });

    let restoredReady = false;
    for (let i = 0; i < 20; i++) {
      await wait(500);
      try {
        const res = await makeRequest('/');
        if (res.status === 200) {
          restoredReady = true;
          break;
        }
      } catch {}
    }
    assert(restoredReady, 'Server restarted successfully with restored active state');

    const restoredClassroom = await makeRequest('/api/student/classroom/1', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(restoredClassroom.status === 200, 'Restored student successfully re-accesses classroom (HTTP 200)');

    // --- PART 12: POLICY GUARD VERIFICATION ---
    console.log('\n--- 12. Policy Guard Verification ---');
    const myCoursesRes = await makeRequest('/api/student/courses', {
      headers: { Cookie: sessionA.cookieHeader },
    });
    assert(myCoursesRes.status === 200, 'My Courses API returns HTTP 200');
    const courses = myCoursesRes.json?.data?.courses || [];
    assert(courses.length > 0, 'Student A has enrolled courses');
    assert(courses[0].classroomAccessEligible === false, 'Course #1 classroomAccessEligible remains strictly false');
    assert(Boolean(courses[0].classroomStatusNotice), 'Course #1 retains locked classroom status notice');

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
  console.log(`FEATURE 3.5 STAGE 4 QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
