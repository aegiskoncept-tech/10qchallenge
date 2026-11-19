// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.1: STUDENT DASHBOARD DATA INTEGRATION TEST SUITE
// Automated Test Suite for Student Dashboard Backend API & Data Access Layer
// ==============================================================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieHeader(response) {
  const rawHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (rawHeaders.length > 0) {
    return rawHeaders.map((c) => c.split(';')[0]).join('; ');
  }
  const single = response.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

function getCsrfToken(cookieHeader) {
  const match = cookieHeader.match(/10q_csrf_token=([^;]+)/);
  return match ? match[1] : '';
}

async function probeUrl(url, options = {}) {
  const startTime = Date.now();
  try {
    const res = await fetch(url, options);
    const latency = Date.now() - startTime;
    let json = null;
    let text = '';
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await res.json();
      } catch (e) {
        text = await res.text();
      }
    } else {
      text = await res.text();
    }
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      latency,
      json,
      text,
      headers: res.headers,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latency: Date.now() - startTime,
      error: err,
    };
  }
}

async function runFeature31Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.1 STUDENT DASHBOARD DATA TESTS');
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

  // --- PART 1: STORAGE & INTEGRITY PRE-CHECK ---
  console.log('--- 1. Storage & Canonical Data Integrity ---');
  const attemptsDataPath = path.join(process.cwd(), 'data', 'test-attempts.json');
  assert(fs.existsSync(attemptsDataPath), 'data/test-attempts.json exists and accessible');
  const doubtsDataPath = path.join(process.cwd(), 'data', 'doubts.json');
  assert(fs.existsSync(doubtsDataPath), 'data/doubts.json exists');
  const seriesDataPath = path.join(process.cwd(), 'data', 'test-series.json');
  assert(fs.existsSync(seriesDataPath), 'data/test-series.json exists');

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
  const createdTestAttemptIds = [];

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

    // --- PART 4: SECURITY & ACCESS CONTROL ---
    console.log('\n--- 4. Security & Access Control on /api/student/dashboard ---');
    const unauthReq = await probeUrl(`${BASE_URL}/api/student/dashboard`);
    assert(unauthReq.status === 401, 'Unauthenticated request rejected with HTTP 401');
    assert(unauthReq.json?.success === false, 'Unauthenticated response indicates success: false');

    const fakeTokenCookie = '10q_auth_token=invalid.jwt.token; Path=/; HttpOnly';
    const fakeAuthReq = await probeUrl(`${BASE_URL}/api/student/dashboard`, {
      headers: { Cookie: fakeTokenCookie },
    });
    assert(fakeAuthReq.status === 401, 'Tampered / invalid JWT rejected with HTTP 401');

    // --- PART 5: AUTHORITATIVE DASHBOARD DATA FOR STUDENT A ---
    console.log('\n--- 5. Authoritative Dashboard Data Retrieval for Student A ---');
    const resA = await probeUrl(`${BASE_URL}/api/student/dashboard`, {
      headers: { Cookie: studentACookie },
    });
    assert(resA.status === 200, 'Student A successfully fetches dashboard data (HTTP 200)');
    assert(resA.json?.success === true, 'Response has success: true');
    const dataA = resA.json?.data;
    assert(Boolean(dataA), 'Dashboard data object is present');

    // Profile verification
    console.log('\n--- 6. Profile Verification ---');
    assert(dataA?.student?.id === studentAUser.id, `Student profile ID matches authenticated user (${studentAUser.id})`);
    assert(dataA?.student?.email === 'test.student@10qchallenge.in', 'Student profile email matches');
    assert(typeof dataA?.student?.fullName === 'string', 'Student fullName is a string');
    assert(dataA?.student?.role === 'STUDENT', 'Student role is STUDENT');
    assert(dataA?.student?.passwordHash === undefined, 'No passwordHash exposed in profile');
    assert(dataA?.student?.salt === undefined, 'No salt exposed in profile');

    // Metrics verification
    console.log('\n--- 7. Overview Metrics Verification ---');
    const metrics = dataA?.overview;
    assert(typeof metrics?.enrolledCoursesCount === 'number', 'enrolledCoursesCount is a number');
    assert(typeof metrics?.completedTestsCount === 'number', 'completedTestsCount is a number');
    assert(typeof metrics?.attemptedTestsCount === 'number', 'attemptedTestsCount is a number');
    assert(typeof metrics?.totalDoubtsCount === 'number', 'totalDoubtsCount is a number');
    assert(typeof metrics?.pendingDoubtsCount === 'number', 'pendingDoubtsCount is a number');
    assert(typeof metrics?.resolvedDoubtsCount === 'number', 'resolvedDoubtsCount is a number');
    assert(typeof metrics?.availableTestsCount === 'number', 'availableTestsCount is a number');
    assert(metrics?.attemptedTestsCount >= metrics?.completedTestsCount, 'attemptedTestsCount >= completedTestsCount');

    // Check reconciliation with data/test-attempts.json
    const allAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const studentAAttempts = allAttempts.filter((a) => Number(a.studentId) === studentAUser.id);
    const studentACompleted = studentAAttempts.filter((a) => a.status === 'COMPLETED');
    assert(metrics.attemptedTestsCount === studentAAttempts.length, `attemptedTestsCount (${metrics.attemptedTestsCount}) matches disk attempts (${studentAAttempts.length})`);
    assert(metrics.completedTestsCount === studentACompleted.length, `completedTestsCount (${metrics.completedTestsCount}) matches disk completed (${studentACompleted.length})`);

    // Check reconciliation with data/doubts.json
    const allDoubts = JSON.parse(fs.readFileSync(doubtsDataPath, 'utf-8'));
    const studentADoubts = allDoubts.filter((d) => Number(d.studentId) === studentAUser.id);
    assert(metrics.totalDoubtsCount === studentADoubts.length, `totalDoubtsCount (${metrics.totalDoubtsCount}) matches disk doubts (${studentADoubts.length})`);

    // Check schema limitations notice
    console.log('\n--- 8. Explicit Schema Limitations Verification ---');
    assert(dataA?.limitations?.courseProgressTracking === 'NOT_SUPPORTED_IN_CURRENT_SCHEMA', 'courseProgressTracking flagged as NOT_SUPPORTED_IN_CURRENT_SCHEMA');
    assert(dataA?.limitations?.recentCourseAccessTracking === 'NOT_SUPPORTED_IN_CURRENT_SCHEMA', 'recentCourseAccessTracking flagged as NOT_SUPPORTED_IN_CURRENT_SCHEMA');

    // --- PART 9: STUDENT DATA ISOLATION (ZERO DATA LEAKAGE) ---
    console.log('\n--- 9. Strict Multi-Tenant Student Isolation ---');
    const resB = await probeUrl(`${BASE_URL}/api/student/dashboard`, {
      headers: { Cookie: studentBCookie },
    });
    assert(resB.status === 200, 'Student B successfully fetches dashboard data (HTTP 200)');
    const dataB = resB.json?.data;
    assert(dataB?.student?.id === studentBUser.id, `Student B profile ID (${dataB?.student?.id}) equals Student B id (${studentBUser.id})`);
    assert(dataB?.student?.id !== dataA?.student?.id, 'Student A and Student B IDs are strictly distinct');
    assert(dataB?.student?.email !== dataA?.student?.email, 'Student A and Student B emails are strictly distinct');

    // Verify Student B does not see Student A's test attempts
    if (dataB?.tests?.recentResults?.length > 0) {
      const bAttempts = dataB.tests.recentResults.map((t) => t.attemptId);
      const aAttempts = dataA?.tests?.recentResults?.map((t) => t.attemptId) || [];
      const intersection = bAttempts.filter((id) => aAttempts.includes(id));
      assert(intersection.length === 0, 'Zero test attempt ID collision/leakage between Student A and Student B');
    } else {
      assert(true, 'Student B has 0 recent tests (isolated cleanly)');
    }

    // Verify Student B does not see Student A's doubts
    if (dataB?.doubts?.recentDoubts?.length > 0) {
      const bDoubtIds = dataB.doubts.recentDoubts.map((d) => d.id);
      const aDoubtIds = dataA?.doubts?.recentDoubts?.map((d) => d.id) || [];
      const intersection = bDoubtIds.filter((id) => aDoubtIds.includes(id));
      assert(intersection.length === 0, 'Zero doubt ID collision/leakage between Student A and Student B');
    } else {
      assert(true, 'Student B has isolated doubts cleanly');
    }

    // --- PART 10: TEST ATTEMPTS & SCORECARD SPOTLIGHT INTEGRATION ---
    console.log('\n--- 10. Test Attempts & Scorecard Consistency ---');
    if (dataA?.tests?.latestScore) {
      const latest = dataA.tests.latestScore;
      assert(typeof latest.attemptId === 'string', 'latestScore attemptId is a string');
      assert(typeof latest.finalScore === 'number', 'latestScore finalScore is a number');
      assert(typeof latest.maximumMarks === 'number', 'latestScore maximumMarks is a number');
      assert(typeof latest.percentageScore === 'number', 'latestScore percentageScore is a number');
      assert(typeof latest.accuracy === 'number', 'latestScore accuracy is a number');
      assert(latest.paperTitle.length > 0, 'latestScore has non-empty paperTitle');
      // Ensure no sensitive answer keys or questions are in latestScore
      assert(latest.correctOption === undefined, 'No correctOption exposed in latestScore');
      assert(latest.explanation === undefined, 'No explanation exposed in latestScore');
    } else {
      console.log('  ℹ No completed test attempt for Student A (latestScore is null as expected)');
    }

    // --- PART 11: RESPONSE SANITIZATION ---
    console.log('\n--- 11. Security Audit: Response Sanitization ---');
    const jsonString = JSON.stringify(dataA);
    assert(!jsonString.includes('passwordHash'), 'No passwordHash in dashboard response payload');
    assert(!jsonString.includes('salt'), 'No salt in dashboard response payload');
    assert(!jsonString.includes('correctOption'), 'No correctOption in dashboard response payload');
    assert(!jsonString.includes('explanation'), 'No explanation in dashboard response payload');
    assert(!jsonString.includes('rangeFrom'), 'No rangeFrom in dashboard response payload');
    assert(!jsonString.includes('rangeTo'), 'No rangeTo in dashboard response payload');

    // --- PART 12: FRONTEND ROUTE SSR & BUNDLE PROBING FOR /student/dashboard ---
    console.log('\n--- 12. Frontend Route SSR HTML & Client Component Probing ---');
    const unauthPageProbe = await probeUrl(`${BASE_URL}/student/dashboard`);
    assert(
      unauthPageProbe.status === 200 || unauthPageProbe.status === 307 || unauthPageProbe.status === 302,
      `SSR Page status returned (${unauthPageProbe.status})`
    );

    const authPageProbe = await probeUrl(`${BASE_URL}/student/dashboard`, {
      headers: { Cookie: studentACookie },
    });
    assert(authPageProbe.status === 200, 'Authenticated student can load /student/dashboard (HTTP 200)');
    assert(
      authPageProbe.text.includes('Loading classroom session...') || authPageProbe.text.includes('dashboard'),
      'HTML contains Student session initialization shell'
    );

    // Verify frontend source code integrity for dashboard page
    const dashboardPageSource = fs.readFileSync(path.join(process.cwd(), 'frontend', 'app', '(student)', 'student', 'dashboard', 'page.tsx'), 'utf-8');
    assert(dashboardPageSource.includes('/api/student/dashboard'), 'Dashboard page fetches authoritative /api/student/dashboard');
    assert(dashboardPageSource.includes('Enrolled Courses'), 'Dashboard page contains Enrolled Courses section');
    assert(dashboardPageSource.includes('Completed CBT Mocks'), 'Dashboard page contains Completed CBT Mocks metric card');
    assert(dashboardPageSource.includes('Faculty Doubts'), 'Dashboard page contains Faculty Doubts metric card');
    assert(dashboardPageSource.includes('Latest Examination Scorecard'), 'Dashboard page contains Latest Examination Scorecard section');

  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nShutting down spawned test server...');
      serverProcess.kill('SIGTERM');
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFeature31Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
