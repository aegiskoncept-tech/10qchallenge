const { spawn } = require('child_process');
const http = require('http');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function probeUrl(url, options = {}) {
  const startTime = Date.now();
  try {
    const res = await fetch(url, options);
    const latency = Date.now() - startTime;
    let text = '';
    let json = null;
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
      statusText: res.statusText,
      contentType,
      length: text ? text.length : (json ? JSON.stringify(json).length : 0),
      latency,
      json,
      headers: res.headers,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      statusText: err.message,
      latency: Date.now() - startTime,
      error: err,
    };
  }
}

function getCookieHeader(response) {
  const rawHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (rawHeaders.length > 0) {
    return rawHeaders.map(c => c.split(';')[0]).join('; ');
  }
  const single = response.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

async function main() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — LOCAL ENVIRONMENT VERIFICATION RUNNER');
  console.log('================================================================\n');

  console.log('[1/4] Spawning local server (node server.js)...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line) console.log(`  [server:stdout] ${line}`);
  });

  serverProcess.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line) console.error(`  [server:stderr] ${line}`);
  });

  // Poll until server is ready
  console.log('[2/4] Waiting for local server to become reachable on http://localhost:3000...');
  let ready = false;
  for (let attempt = 1; attempt <= 30; attempt++) {
    await wait(1000);
    const probe = await probeUrl('http://localhost:3000/');
    if (probe.status > 0) {
      ready = true;
      console.log(`  ✓ Server reachable on attempt ${attempt} (Status: ${probe.status})`);
      break;
    }
  }

  if (!ready) {
    console.error('  ✗ Timed out waiting for server to start.');
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  console.log('\n[3/4] Probing Key Public, Admin, Student, and API Routes...');
  const tests = [
    { name: 'Homepage', url: 'http://localhost:3000/', expected: [200] },
    { name: 'Course Listing (/course-all)', url: 'http://localhost:3000/course-all', expected: [200] },
    { name: 'Course Listing (/courses)', url: 'http://localhost:3000/courses', expected: [200] },
    { name: 'Course Detail (bitsat-2026)', url: 'http://localhost:3000/course-detail/bitsat-2026-master-crash-course', expected: [200] },
    { name: 'Course Detail (jee-main-2026)', url: 'http://localhost:3000/course-detail/jee-main-2026-rank-booster-batch', expected: [200] },
    { name: 'Login Portal (Admin & Student)', url: 'http://localhost:3000/login', expected: [200] },
    { name: 'Admin Dashboard Root (/admin)', url: 'http://localhost:3000/admin', expected: [200, 307, 308] },
    { name: 'Admin Dashboard Overview (/admin/dashboard)', url: 'http://localhost:3000/admin/dashboard', expected: [200, 307, 308] },
    { name: 'Admin Courses Manager (/admin/courses)', url: 'http://localhost:3000/admin/courses', expected: [200, 307, 308] },
    { name: 'Student Dashboard (/student/dashboard)', url: 'http://localhost:3000/student/dashboard', expected: [200, 307, 308] },
    { name: 'Public Courses API (/api/courses)', url: 'http://localhost:3000/api/courses', expected: [200] },
    { name: 'Public Exams API (/api/exams)', url: 'http://localhost:3000/api/exams', expected: [200] },
    { name: 'Student Doubts API Unauth Guard (/api/student/doubts)', url: 'http://localhost:3000/api/student/doubts', expected: [401] },
    { name: 'Admin Courses API Unauth Guard (/api/admin/courses)', url: 'http://localhost:3000/api/admin/courses', expected: [401] },
  ];

  const results = [];
  for (const t of tests) {
    const probe = await probeUrl(t.url);
    const pass = t.expected.includes(probe.status);
    console.log(`  ${pass ? '✓ PASS' : '✗ FAIL'}: ${t.name} -> HTTP ${probe.status} (${probe.latency}ms) [Length: ${probe.length} bytes]`);
    results.push({ ...t, probe, pass });
  }

  console.log('\n[4/4] Testing Authenticated Workflows & Live API Contracts...');
  // 1. Authenticate Student
  const studentLoginRes = await probeUrl('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
  });
  const studentLoginPass = studentLoginRes.status === 200 && studentLoginRes.json?.user?.role === 'STUDENT';
  console.log(`  ${studentLoginPass ? '✓ PASS' : '✗ FAIL'}: Student Authentication (/api/auth/login) -> HTTP ${studentLoginRes.status}`);

  const studentCookie = getCookieHeader(studentLoginRes);

  // Probe student doubts with student session
  const studentDoubtsRes = await probeUrl('http://localhost:3000/api/student/doubts', {
    headers: { 'Cookie': studentCookie },
  });
  const studentDoubtsPass = studentDoubtsRes.status === 200 && studentDoubtsRes.json?.success === true;
  console.log(`  ${studentDoubtsPass ? '✓ PASS' : '✗ FAIL'}: Student Doubts API Authenticated -> HTTP ${studentDoubtsRes.status} (Count: ${studentDoubtsRes.json?.count})`);

  // 2. Authenticate Admin
  const adminLoginRes = await probeUrl('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'AdminPass2026!' }),
  });
  const adminLoginPass = adminLoginRes.status === 200 && adminLoginRes.json?.user?.role === 'ADMIN';
  console.log(`  ${adminLoginPass ? '✓ PASS' : '✗ FAIL'}: Admin Authentication (/api/auth/login) -> HTTP ${adminLoginRes.status}`);

  const adminCookie = getCookieHeader(adminLoginRes);

  // Probe admin courses API with admin session
  const adminCoursesRes = await probeUrl('http://localhost:3000/api/admin/courses', {
    headers: { 'Cookie': adminCookie },
  });
  const adminCoursesPass = adminCoursesRes.status === 200 && adminCoursesRes.json?.success === true;
  console.log(`  ${adminCoursesPass ? '✓ PASS' : '✗ FAIL'}: Admin Courses API Authenticated -> HTTP ${adminCoursesRes.status} (Courses count: ${adminCoursesRes.json?.data?.length})`);

  // Probe admin chapters API with admin session
  const adminChaptersRes = await probeUrl('http://localhost:3000/api/admin/chapters', {
    headers: { 'Cookie': adminCookie },
  });
  const adminChaptersPass = adminChaptersRes.status === 200 && adminChaptersRes.json?.success === true;
  console.log(`  ${adminChaptersPass ? '✓ PASS' : '✗ FAIL'}: Admin Chapters API Authenticated -> HTTP ${adminChaptersRes.status} (Chapters count: ${adminChaptersRes.json?.data?.length})`);

  // Gracefully terminate server
  console.log('\nShutting down local test server...');
  serverProcess.kill('SIGTERM');
  await wait(1000);

  const allPassed = results.every(r => r.pass) && studentLoginPass && studentDoubtsPass && adminLoginPass && adminCoursesPass && adminChaptersPass;
  console.log('================================================================');
  console.log(`LOCAL ENVIRONMENT INTEGRATION RESULT: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL RUNNER ERROR]', err);
  process.exit(1);
});
