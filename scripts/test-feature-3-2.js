// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.2: STUDENT PROFILE & ACCOUNT MANAGEMENT TEST SUITE
// Automated Test Suite for Student Profile APIs, Validation & Security Rules
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

async function runFeature32Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.2 STUDENT PROFILE & ACCOUNT TESTS');
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
  console.log('--- 1. Relational Auth Storage Pre-Check ---');
  const dbPath = path.join(process.cwd(), 'database', '10q_auth_dev.db');
  assert(fs.existsSync(dbPath), 'database/10q_auth_dev.db exists and accessible');
  const examsDataPath = path.join(process.cwd(), 'data', 'exams.json');
  assert(fs.existsSync(examsDataPath), 'data/exams.json canonical exams file exists');

  const canonicalExamsJson = JSON.parse(fs.readFileSync(examsDataPath, 'utf-8'));
  const canonicalExamNames = canonicalExamsJson.map((e) => e.examName);
  console.log('  Authoritative Canonical Exams:', canonicalExamNames.join(', '));
  assert(canonicalExamNames.length === 5, 'Canonical exams count is 5');
  assert(canonicalExamNames.includes('BITSAT'), 'BITSAT is canonical');
  assert(canonicalExamNames.includes('Comedk'), 'Comedk is canonical');
  assert(canonicalExamNames.includes('JEE'), 'JEE is canonical');
  assert(canonicalExamNames.includes('Manipal (MET)'), 'Manipal (MET) is canonical');
  assert(canonicalExamNames.includes('VITEEE'), 'VITEEE is canonical');

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
    let studentACookie = getCookieHeader(studentALogin);
    let studentACsrf = getCsrfToken(studentACookie);
    const studentAUser = studentALogin.json?.user;

    const studentBLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(studentBLogin.status === 200, 'Student B authenticated successfully');
    const studentBCookie = getCookieHeader(studentBLogin);
    const studentBCsrf = getCsrfToken(studentBCookie);
    const studentBUser = studentBLogin.json?.user;

    // Record initial profile state for Student A & B for clean rollback
    const initialGetA = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: studentACookie },
    });
    const originalProfileA = initialGetA.json?.data || {};

    const initialGetB = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: studentBCookie },
    });
    const originalProfileB = initialGetB.json?.data || {};

    // --- PART 4: PROFILE RETRIEVAL & SECURITY GUARDS ---
    console.log('\n--- 4. Profile Retrieval & Security Guards ---');
    const unauthGet = await probeUrl(`${BASE_URL}/api/student/profile`);
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/student/profile rejected with HTTP 401');

    const fakeTokenCookie = '10q_auth_token=tampered.fake.jwt; Path=/; HttpOnly';
    const fakeAuthGet = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: fakeTokenCookie },
    });
    assert(fakeAuthGet.status === 401, 'Tampered token rejected with HTTP 401');

    const authGetA = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: studentACookie },
    });
    assert(authGetA.status === 200, 'Authenticated Student A receives HTTP 200');
    assert(authGetA.json?.success === true, 'Response payload contains success: true');
    const profileA = authGetA.json?.data;
    assert(Boolean(profileA), 'Profile data object present');
    assert(profileA.id === studentAUser.id, `Profile ID matches authenticated user (${studentAUser.id})`);
    assert(profileA.email === 'test.student@10qchallenge.in', 'Profile email matches');
    assert(profileA.role === 'STUDENT', 'Profile role is STUDENT');
    assert(profileA.accountStatus === 'ACTIVE', 'Account status is ACTIVE');
    assert(typeof profileA.createdAt === 'string', 'createdAt timestamp is a string');
    assert(typeof profileA.updatedAt === 'string', 'updatedAt timestamp is a string');

    // Secret Redaction in GET
    console.log('\n--- 5. Response Secret Redaction Audit ---');
    const jsonA = JSON.stringify(authGetA.json);
    assert(!jsonA.includes('passwordHash'), 'No passwordHash in GET response');
    assert(!jsonA.includes('salt'), 'No salt in GET response');
    assert(!jsonA.includes('sessionId'), 'No sessionId in GET response');

    // --- PART 6: TASK 1 — DYNAMIC STUDENT ID VALIDATION ---
    console.log('\n--- 6. Task 1: Dynamic Student ID Verification ---');
    // Verify Student A sees Student A's ID
    assert(profileA.id === studentAUser.id, `Student A profile ID dynamically returns ${studentAUser.id}`);

    // Verify Student B sees Student B's ID
    const authGetB = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: studentBCookie },
    });
    const profileB = authGetB.json?.data;
    assert(profileB.id === studentBUser.id, `Student B profile ID dynamically returns ${studentBUser.id}`);
    assert(profileA.id !== profileB.id, 'Student A and Student B IDs are strictly distinct');

    // Check page.tsx source code: verify no hardcoded #8 exists in template
    const profilePageSource = fs.readFileSync(path.join(process.cwd(), 'frontend', 'app', '(student)', 'student', 'profile', 'page.tsx'), 'utf-8');
    assert(!profilePageSource.includes('#8'), 'Profile page contains no hardcoded "#8" account ID');
    assert(profilePageSource.includes('profile?.id'), 'Profile page dynamically renders ID from profile.id');

    // --- PART 7: TASK 2 — CANONICAL TARGET EXAMINATION OPTIONS ---
    console.log('\n--- 7. Task 2: Canonical Target Examination Options Verification ---');

    // Test saving each of the 5 canonical exams
    for (const exam of ['BITSAT', 'Comedk', 'JEE', 'Manipal (MET)', 'VITEEE']) {
      const examUpdate = await probeUrl(`${BASE_URL}/api/student/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentACookie,
          'x-csrf-token': studentACsrf,
        },
        body: JSON.stringify({ targetExam: exam }),
      });
      assert(examUpdate.status === 200, `Canonical exam "${exam}" accepted with HTTP 200`);
      assert(examUpdate.json?.data?.targetExam === exam, `Canonical exam "${exam}" accurately stored`);
    }

    // Verify non-canonical exams are REJECTED with HTTP 400
    // Specifically verify JEE Advanced is rejected because it does NOT exist in canonical source
    const jeeAdvUpdate = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ targetExam: 'JEE Advanced' }),
    });
    assert(jeeAdvUpdate.status === 400, 'Non-canonical "JEE Advanced" rejected with HTTP 400');

    const arbitraryExamUpdate = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ targetExam: 'ArbitraryExamXYZ' }),
    });
    assert(arbitraryExamUpdate.status === 400, 'Arbitrary examination rejected with HTTP 400');

    // Verify registration view options align with canonical exams
    const registerViewSource = fs.readFileSync(path.join(process.cwd(), 'frontend', 'src', 'views', 'Register.jsx'), 'utf-8');
    assert(!registerViewSource.includes('value="JEE Advanced"'), 'Register.jsx excludes non-canonical "JEE Advanced"');
    assert(registerViewSource.includes('value="BITSAT"'), 'Register.jsx includes canonical BITSAT');
    assert(registerViewSource.includes('value="JEE"'), 'Register.jsx includes canonical JEE');
    assert(registerViewSource.includes('value="Comedk"'), 'Register.jsx includes canonical Comedk');
    assert(registerViewSource.includes('value="Manipal (MET)"'), 'Register.jsx includes canonical Manipal (MET)');
    assert(registerViewSource.includes('value="VITEEE"'), 'Register.jsx includes canonical VITEEE');

    // Verify profile page dropdown options align with canonical exams
    assert(!profilePageSource.includes("value: 'JEE Advanced'"), 'Profile page excludes non-canonical "JEE Advanced"');
    assert(profilePageSource.includes("value: 'BITSAT'"), 'Profile page includes canonical BITSAT');
    assert(profilePageSource.includes("value: 'JEE'"), 'Profile page includes canonical JEE');
    assert(profilePageSource.includes("value: 'Comedk'"), 'Profile page includes canonical Comedk');
    assert(profilePageSource.includes("value: 'Manipal (MET)'"), 'Profile page includes canonical Manipal (MET)');
    assert(profilePageSource.includes("value: 'VITEEE'"), 'Profile page includes canonical VITEEE');

    // --- PART 8: PROFILE EDITING & INPUT VALIDATION ---
    console.log('\n--- 8. Profile Editing & Input Validation ---');

    // Valid fullName update
    const updateNameRes = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ fullName: 'Advik Sharma Updated' }),
    });
    assert(updateNameRes.status === 200, 'Valid fullName update returns HTTP 200');
    assert(updateNameRes.json?.data?.fullName === 'Advik Sharma Updated', 'fullName accurately updated');

    // Valid mobileNumber update
    const updateMobileRes = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ mobileNumber: '+91 9876543210' }),
    });
    assert(updateMobileRes.status === 200, 'Valid mobileNumber update returns HTTP 200');
    assert(updateMobileRes.json?.data?.mobileNumber === '+91 9876543210', 'mobileNumber accurately updated');

    // Input validation errors
    const emptyPayload = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({}),
    });
    assert(emptyPayload.status === 400, 'Empty payload {} rejected with HTTP 400');

    const emptyName = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ fullName: '   ' }),
    });
    assert(emptyName.status === 400, 'Empty / whitespace fullName rejected with HTTP 400');

    const shortName = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ fullName: 'A' }),
    });
    assert(shortName.status === 400, '1-character fullName rejected with HTTP 400');

    const invalidMobile = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ mobileNumber: 'not-a-phone-number' }),
    });
    assert(invalidMobile.status === 400, 'Invalid mobile number string rejected with HTTP 400');

    // --- PART 9: SECURITY AUDIT & PROTECTED FIELDS REJECTION ---
    console.log('\n--- 9. Security Audit: Protected Fields Rejection ---');

    for (const field of ['id', 'role', 'isActive', 'email', 'isEmailVerified', 'passwordHash', 'token']) {
      const payload = { [field]: 'tamper-attempt' };
      const tamperRes = await probeUrl(`${BASE_URL}/api/student/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: studentACookie,
          'x-csrf-token': studentACsrf,
        },
        body: JSON.stringify(payload),
      });
      assert(tamperRes.status === 400, `Protected field "${field}" modification rejected with HTTP 400`);
    }

    // SQL Injection resilience
    const sqliAttempt = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({ fullName: "Robert'; DROP TABLE users; --" }),
    });
    assert(sqliAttempt.status === 200, 'SQL injection string processed safely through parameterized SQL');
    assert(sqliAttempt.json?.data?.fullName === "Robert'; DROP TABLE users; --", 'Stored literal string safely');

    // --- PART 10: TASK 3 — FRESH-SESSION PERSISTENCE TEST ---
    console.log('\n--- 10. Task 3: Fresh-Session Persistence Workflow ---');

    // Step 1: Student A is authenticated
    assert(Boolean(studentAUser), 'Step 1: Student A is authenticated');

    // Step 2: Updates full name, mobile number and target examination
    const freshTestName = 'Advik Sharma Fresh Session';
    const freshTestMobile = '+91 9988776655';
    const freshTestExam = 'Comedk';

    const step2Update = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie,
        'x-csrf-token': studentACsrf,
      },
      body: JSON.stringify({
        fullName: freshTestName,
        mobileNumber: freshTestMobile,
        targetExam: freshTestExam,
      }),
    });
    assert(step2Update.status === 200, 'Step 2: Profile updated with test values (HTTP 200)');

    // Step 3: End the authenticated session
    const step3Logout = await probeUrl(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert(step3Logout.status === 200, 'Step 3: Authenticated session ended via logout');

    // Verify session is no longer valid
    const postLogoutCheck = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: studentACookie },
    });
    assert(postLogoutCheck.status === 401, 'Terminated session cannot access /api/student/profile (HTTP 401)');

    // Step 4: Create a fresh authenticated session using the existing login process
    const step4FreshLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(step4FreshLogin.status === 200, 'Step 4: Fresh authenticated session created via login (HTTP 200)');
    const freshCookie = getCookieHeader(step4FreshLogin);
    const freshCsrf = getCsrfToken(freshCookie);

    // Step 5: Retrieve /api/student/profile with the fresh session
    const step5GetProfile = await probeUrl(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: freshCookie },
    });
    assert(step5GetProfile.status === 200, 'Step 5: Retrieved /api/student/profile using fresh session (HTTP 200)');
    const persistedProfile = step5GetProfile.json?.data;

    // Step 6: Confirms all updated values persist
    assert(persistedProfile?.fullName === freshTestName, `Step 6a: Updated fullName persisted across sessions ("${freshTestName}")`);
    assert(persistedProfile?.mobileNumber === freshTestMobile, `Step 6b: Updated mobileNumber persisted across sessions ("${freshTestMobile}")`);
    assert(persistedProfile?.targetExam === freshTestExam, `Step 6c: Updated targetExam persisted across sessions ("${freshTestExam}")`);

    // Step 7: Confirms Student A's original user ID, email and role remain unchanged
    assert(persistedProfile?.id === studentAUser.id, `Step 7a: Original user ID remains unchanged (${studentAUser.id})`);
    assert(persistedProfile?.email === 'test.student@10qchallenge.in', 'Step 7b: Original email remains unchanged');
    assert(persistedProfile?.role === 'STUDENT', 'Step 7c: Original role remains unchanged (STUDENT)');
    assert(persistedProfile?.accountStatus === 'ACTIVE', 'Step 7d: Account status remains ACTIVE');

    // Confirm Feature 3.1 dashboard also reflects the fresh-session persisted values
    const dashCheck = await probeUrl(`${BASE_URL}/api/student/dashboard`, {
      headers: { Cookie: freshCookie },
    });
    assert(dashCheck.json?.data?.student?.fullName === freshTestName, 'Dashboard reflects updated fullName');
    assert(dashCheck.json?.data?.student?.targetExam === freshTestExam, 'Dashboard reflects updated targetExam');

    // --- DATA RESTORATION (CLEANUP) ---
    console.log('\n--- 11. Restoring Original Test Fixture Data ---');
    const restoreA = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: freshCookie,
        'x-csrf-token': freshCsrf,
      },
      body: JSON.stringify({
        fullName: 'Advik Sharma',
        mobileNumber: originalProfileA.mobileNumber || '+91 9876543210',
        targetExam: 'BITSAT',
      }),
    });
    assert(restoreA.status === 200, 'Student A test data cleanly restored to baseline');

    const restoreB = await probeUrl(`${BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentBCookie,
        'x-csrf-token': studentBCsrf,
      },
      body: JSON.stringify({
        fullName: originalProfileB.fullName || 'Isolation Test User',
        mobileNumber: originalProfileB.mobileNumber || null,
        targetExam: 'BITSAT',
      }),
    });
    assert(restoreB.status === 200, 'Student B test data cleanly restored to baseline');

  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nShutting down spawned test server...');
      serverProcess.kill('SIGTERM');
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 3.2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFeature32Tests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
