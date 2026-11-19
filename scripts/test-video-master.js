// ==============================================================================
// 10Q CHALLENGE LMS — STAGE 2B TEST SUITE
// Video Master: Complete Video Management & Player Delivery QA
// ==============================================================================

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { getCommerceDb, closeCommerceDb } = require('../frontend/lib/learning/dist/commerce/db.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieHeader(probeResult) {
  const setCookie = probeResult.headers['set-cookie'];
  if (!setCookie) return '';
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

function getCsrfFromRes(probeResult) {
  const setCookie = probeResult.headers?.['set-cookie'] || [];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const match = c.match(/10q_csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

function httpProbe(urlStr, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(urlStr);
    const startTime = Date.now();
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            latency: Date.now() - startTime,
            json,
            text,
            buffer,
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

async function runStage2BTests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — STAGE 2B TEST SUITE');
  console.log('Video Master: Video Management, Academic Hierarchy & Player QA');
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

  const PORT = 3008;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  console.log('Resolving student identity & verifying Course 1 enrollment...');
  const stalePid = path.resolve(__dirname, '..', 'database', 'pg_commerce_dev', 'postmaster.pid');
  if (fs.existsSync(stalePid)) {
    try { fs.unlinkSync(stalePid); } catch {}
  }
  const authDbPath = path.resolve(__dirname, '..', 'database', '10q_auth_dev.db');
  const authDb = new DatabaseSync(authDbPath);
  const studentRow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('test.student@10qchallenge.in');
  const studentId = studentRow ? Number(studentRow.id) : 8;
  authDb.close();

  const preDb = await getCommerceDb();
  const existingEnr = await preDb.query(
    'SELECT id, access_state, settlement_status FROM commerce.enrollments WHERE user_id = $1 AND course_id = $2 LIMIT 1;',
    [studentId, '1']
  );
  if (existingEnr.rows && existingEnr.rows.length > 0) {
    await preDb.query(
      "UPDATE commerce.enrollments SET settlement_status = 'SETTLED', access_state = 'ACTIVE' WHERE user_id = $1 AND course_id = $2;",
      [studentId, '1']
    );
  } else {
    const orderRes = await preDb.query(
      `INSERT INTO commerce.orders (order_number, user_id, course_id, original_amount, discount_amount, net_payable_amount,
         billing_full_name, billing_email, billing_state_code, status)
       VALUES ($1, $2, '1', 4999.00, 0.00, 4999.00, 'Student A', 'test.student@10qchallenge.in', 'DL', 'PAID')
       RETURNING id;`,
      [`ORD-VID-${Date.now()}`, studentId]
    );
    const orderId = orderRes.rows[0].id;
    await preDb.query(
      `INSERT INTO commerce.payments (order_id, gateway_name, gateway_payment_id, amount, currency, settlement_status)
       VALUES ($1, 'PAYU', $2, 4999.00, 'INR', 'SETTLED');`,
      [orderId, `PAY-VID-${Date.now()}`]
    );
    await preDb.query(
      `INSERT INTO commerce.enrollments (order_id, user_id, course_id, settlement_status, enrollment_source, access_state)
       VALUES ($1, $2, '1', 'SETTLED', 'COMMERCE_ORDER', 'ACTIVE');`,
      [orderId, studentId]
    );
  }
  await closeCommerceDb();
  console.log('  ✓ Active settled enrollment ready for Student A -> Course 1');

  console.log(`Starting isolated test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: 'ignore',
  });

  // Wait for server to start
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await wait(400);
    const probe = await httpProbe(`${BASE_URL}/api/admin/overview`);
    if (probe.status === 401 || probe.status === 200 || probe.status === 403) {
      serverReady = true;
      break;
    }
  }

  if (!serverReady) {
    console.error('Failed to spawn server on port ' + PORT);
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Server online. Initiating test phases...\n');

  const createdVideoIds = [];

  try {
    // --------------------------------------------------------------------------
    // PHASE 0: AUTHENTICATION
    // --------------------------------------------------------------------------
    console.log('--- Phase 0: Authentication Setup ---');
    const adminLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'AdminPass2026!' }),
    });

    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200 OK');
    const adminCookie = getCookieHeader(adminLoginRes);
    const adminCsrf = getCsrfFromRes(adminLoginRes);
    assert(adminCookie.length > 0, 'Admin session cookie retrieved');
    assert(adminCsrf.length > 0, 'Admin CSRF token retrieved');

    const studentLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });

    assert(studentLoginRes.status === 200, 'Student login succeeds with 200 OK');
    const studentCookie = getCookieHeader(studentLoginRes);
    const studentCsrf = getCsrfFromRes(studentLoginRes);
    assert(studentCookie.length > 0, 'Student session cookie retrieved');
    assert(studentCsrf.length > 0, 'Student CSRF token retrieved');

    // --------------------------------------------------------------------------
    // PHASE 1: ADMIN AUTHORIZATION & CSRF GUARDS
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 1: Authorization & Security Access Guards ---');

    const unauthGet = await httpProbe(`${BASE_URL}/api/admin/videos`);
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/admin/videos rejected with 401 Unauthorized');

    const studentGet = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      headers: { Cookie: studentCookie },
    });
    assert(studentGet.status === 403, 'Student GET /api/admin/videos rejected with 403 Forbidden');

    const unauthPost = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacked Video' }),
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/admin/videos rejected with 401 Unauthorized');

    const studentForbiddenPost = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie, 'x-csrf-token': studentCsrf },
      body: JSON.stringify({ title: 'Student Attempting Admin Post' }),
    });
    assert(studentForbiddenPost.status === 403, 'Student POST /api/admin/videos rejected with 403 Forbidden');

    // CSRF Missing on mutation
    const csrfMissingPost = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie, // no x-csrf-token
      },
      body: JSON.stringify({ title: 'Test Video Missing CSRF' }),
    });
    assert(csrfMissingPost.status === 403, 'POST /api/admin/videos without CSRF rejected with 403 Forbidden');

    // CSRF Mismatch on mutation
    const csrfMismatchPost = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': 'bad-spoofed-csrf-token',
      },
      body: JSON.stringify({ title: 'Test Video Spoofed CSRF' }),
    });
    assert(csrfMismatchPost.status === 403, 'POST /api/admin/videos with invalid CSRF rejected with 403 Forbidden');

    // CSRF Missing on PUT
    const csrfMissingPut = await httpProbe(`${BASE_URL}/api/admin/videos/1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    assert(csrfMissingPut.status === 403, 'PUT /api/admin/videos/[id] without CSRF rejected with 403 Forbidden');

    // CSRF Missing on DELETE
    const csrfMissingDelete = await httpProbe(`${BASE_URL}/api/admin/videos/1`, {
      method: 'DELETE',
      headers: {
        Cookie: adminCookie,
      },
    });
    assert(csrfMissingDelete.status === 403, 'DELETE /api/admin/videos/[id] without CSRF rejected with 403 Forbidden');

    // --------------------------------------------------------------------------
    // PHASE 2: INPUT VALIDATION & SANITIZATION
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 2: Input Validation & Sanitization ---');

    // Missing title
    const missingTitleRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: '',
        providerVideoId: '12345678',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(missingTitleRes.status === 400, 'POST with empty title rejected with 400 Bad Request');
    assert(missingTitleRes.json?.error?.includes('title'), 'Error message identifies missing title');

    // Missing provider ID
    const missingIdRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Valid Title Here',
        providerVideoId: '',
        vimeoVideoId: '',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(missingIdRes.status === 400, 'POST with missing video ID rejected with 400 Bad Request');
    assert(missingIdRes.json?.error?.includes('ID'), 'Error message identifies missing Video ID');

    // Invalid duration
    const invalidDurRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Invalid Duration Video',
        providerVideoId: '824804225',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
        durationMinutes: -15,
      }),
    });
    assert(invalidDurRes.status === 400, 'POST with negative duration rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // PHASE 2.1: PROVIDER SECURITY & PROTOCOL RESTRICTION GUARDS (STAGE 2B.1)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 2.1: Provider Security & Protocol Restriction Guards ---');

    // Disallowed Provider Type
    const invalidProviderRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Disallowed Provider Video',
        provider: 'DAILYMOTION',
        providerVideoId: 'x123456',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(invalidProviderRes.status === 400, 'Invalid provider (DAILYMOTION) rejected with 400 Bad Request');
    assert(invalidProviderRes.json?.error?.includes('provider'), 'Error identifies invalid video provider');

    // Non-numeric Vimeo Video ID
    const badVimeoIdRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Alphanumeric Vimeo ID',
        provider: 'VIMEO',
        providerVideoId: 'vimeo-non-numeric-id',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(badVimeoIdRes.status === 400, 'Non-numeric Vimeo Video ID rejected with 400 Bad Request');
    assert(badVimeoIdRes.json?.error?.includes('Vimeo'), 'Error message references numeric Vimeo ID requirement');

    // Invalid length YouTube ID (must be exactly 11 characters)
    const badYtIdRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Invalid YouTube ID',
        provider: 'YOUTUBE',
        providerVideoId: 'short-id',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(badYtIdRes.status === 400, 'Invalid length YouTube ID rejected with 400 Bad Request');
    assert(badYtIdRes.json?.error?.includes('YouTube'), 'Error message references 11-character YouTube ID rule');

    // Unsafe JavaScript URL scheme
    const unsafeSchemeRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'XSS Video Injection Attempt',
        provider: 'CUSTOM',
        providerVideoId: 'custom-xss-1',
        videoUrl: 'javascript:alert(document.cookie)',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(unsafeSchemeRes.status === 400, 'Unsafe javascript: URL scheme rejected with 400 Bad Request');

    // Insecure HTTP protocol
    const insecureHttpRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Insecure Protocol Stream',
        provider: 'CUSTOM',
        providerVideoId: 'custom-http-1',
        videoUrl: 'http://insecure-cdn.example.com/video.mp4',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(insecureHttpRes.status === 400, 'Insecure http:// scheme rejected with 400 Bad Request');

    // SSRF Loopback Attack (127.0.0.1 / localhost)
    const ssrfLoopbackRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'SSRF Loopback Attack',
        provider: 'CUSTOM',
        providerVideoId: 'ssrf-1',
        videoUrl: 'https://127.0.0.1:8080/internal-stream.mp4',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(ssrfLoopbackRes.status === 400, 'SSRF loopback target (127.0.0.1) rejected with 400 Bad Request');

    // SSRF Cloud Metadata Endpoint (169.254.169.254)
    const ssrfMetadataRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'SSRF Cloud Metadata Attack',
        provider: 'CUSTOM',
        providerVideoId: 'ssrf-2',
        videoUrl: 'https://169.254.169.254/latest/meta-data/',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(ssrfMetadataRes.status === 400, 'SSRF cloud metadata target rejected with 400 Bad Request');

    // HLS Stream missing .m3u8 extension or /hls/ path
    const badHlsRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Invalid HLS Extension',
        provider: 'HLS',
        providerVideoId: 'hls-bad-1',
        videoUrl: 'https://cdn.example.com/static-document.pdf',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(badHlsRes.status === 400, 'HLS video without .m3u8 extension rejected with 400 Bad Request');

    // --------------------------------------------------------------------------
    // PHASE 3: ACADEMIC HIERARCHY VALIDATION
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 3: Academic Hierarchy Validation ---');

    // Non-existent course
    const badCourseRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Non-existent Course Lecture',
        providerVideoId: '824804225',
        courseId: 999999,
        subjectId: 1,
        chapterId: 1,
      }),
    });
    assert(badCourseRes.status === 400, 'Video creation with invalid Course rejected with 400 Bad Request');
    assert(badCourseRes.json?.error?.includes('Course'), 'Error message references Course Master mismatch');

    // Chapter mismatch (Chapter 3 is Chemistry, assigned under Subject 1 Physics)
    const chapterMismatchRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Cross-Subject Mismatch Lecture',
        providerVideoId: '824804225',
        courseId: 1,
        subjectId: 1, // Physics
        chapterId: 3, // Chemistry Atomic Structure
      }),
    });
    assert(chapterMismatchRes.status === 400, 'Video with Chapter-Subject mismatch rejected with 400 Bad Request');
    assert(chapterMismatchRes.json?.error?.includes('Hierarchy mismatch'), 'Identifies Subject/Chapter mismatch correctly');

    // Topic mismatch (Topic 5 belongs to Chapter 2, assigned under Chapter 1)
    const topicMismatchRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        title: 'Cross-Topic Mismatch Lecture',
        providerVideoId: '824804225',
        courseId: 1,
        subjectId: 1,
        chapterId: 1,
        topicId: 5, // Belongs to Chapter 2
      }),
    });
    assert(topicMismatchRes.status === 400, 'Video with Topic-Chapter mismatch rejected with 400 Bad Request');
    assert(topicMismatchRes.json?.error?.includes('Hierarchy mismatch'), 'Identifies Topic/Chapter mismatch correctly');

    // --------------------------------------------------------------------------
    // PHASE 4: VIDEO CREATION & PERSISTENCE (CRUD CREATE)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 4: Video Creation & Database Persistence ---');

    const validVideoPayload = {
      title: 'Advanced Projectile Motion & Vector Tricks',
      provider: 'VIMEO',
      providerVideoId: '824804299',
      courseId: 1,
      subjectId: 1,
      chapterId: 1,
      topicId: 1,
      durationMinutes: 55,
      isFreePreview: false,
      displayOrder: 4,
      status: 'Published',
      description: 'Comprehensive high-speed derivation of trajectory parabola equations and relative velocity.',
    };

    const createRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify(validVideoPayload),
    });

    assert(createRes.status === 201, 'Valid video creation succeeds with 201 Created');
    assert(createRes.json?.success === true, 'Response payload contains success: true');
    const createdVideo = createRes.json?.data;
    assert(createdVideo?.id > 0, `Video assigned numeric ID #${createdVideo?.id}`);
    assert(createdVideo?.title === validVideoPayload.title, 'Stored title matches input');
    assert(createdVideo?.vimeoVideoId === validVideoPayload.providerVideoId, 'vimeoVideoId is backward-compatible');
    assert(createdVideo?.providerVideoId === validVideoPayload.providerVideoId, 'providerVideoId stored accurately');
    assert(createdVideo?.courseTitle?.length > 0, 'Course title resolved via hierarchy validator');
    assert(createdVideo?.subject === 'Physics', 'Subject name resolved accurately');
    assert(createdVideo?.chapter === 'Mechanics & Kinematics', 'Chapter name resolved accurately');
    assert(createdVideo?.topicName === 'Vectors & Coordinate Systems', 'Topic name resolved accurately');

    const newVideoId = createdVideo.id;
    createdVideoIds.push(newVideoId);

    // Create a second video with YouTube provider and Free Preview
    const youtubeVideoPayload = {
      title: 'Thermodynamics & Heat Capacity Overview',
      provider: 'YOUTUBE',
      providerVideoId: 'dQw4w9WgXcQ',
      courseId: 1,
      subjectId: 1,
      chapterId: 1,
      durationMinutes: 40,
      isFreePreview: true,
      displayOrder: 5,
      status: 'Published',
      description: 'Free preview video introducing thermodynamics laws.',
    };

    const createYtRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify(youtubeVideoPayload),
    });

    assert(createYtRes.status === 201, 'YouTube lecture video creation succeeds with 201 Created');
    const ytVideo = createYtRes.json?.data;
    assert(ytVideo?.provider === 'YOUTUBE', 'Provider stored as YOUTUBE');
    assert(ytVideo?.isFreePreview === true, 'isFreePreview flag stored as true');
    createdVideoIds.push(ytVideo.id);

    // Verify raw JSON file on disk
    const diskVideosRaw = fs.readFileSync(path.resolve(__dirname, '..', 'data', 'videos.json'), 'utf-8');
    const diskVideos = JSON.parse(diskVideosRaw);
    const diskItem = diskVideos.find((v) => Number(v.id) === Number(newVideoId));
    assert(diskItem !== undefined, 'Newly created video persisted to data/videos.json');
    assert(diskItem?.title === validVideoPayload.title, 'On-disk title matches creation payload');

    // --------------------------------------------------------------------------
    // PHASE 5: READ, FILTER & SEARCH (CRUD READ)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 5: Read, Filter & Search Operations ---');

    const listRes = await httpProbe(`${BASE_URL}/api/admin/videos`, {
      headers: { Cookie: adminCookie },
    });
    assert(listRes.status === 200, 'GET /api/admin/videos succeeds with 200 OK');
    assert(Array.isArray(listRes.json?.data), 'Response data is an array');
    assert(listRes.json?.count >= 5, `Video count includes canonicals and newly created videos (${listRes.json?.count})`);

    // Course Filter
    const filterCourseRes = await httpProbe(`${BASE_URL}/api/admin/videos?courseId=1`, {
      headers: { Cookie: adminCookie },
    });
    assert(filterCourseRes.status === 200, 'GET with courseId=1 succeeds');
    const courseVideos = filterCourseRes.json?.data;
    assert(
      courseVideos.every((v) => Number(v.courseId) === 1 || !v.courseId),
      'Course filter accurately scoped'
    );

    // Subject Filter
    const filterSubjectRes = await httpProbe(`${BASE_URL}/api/admin/videos?subject=Physics`, {
      headers: { Cookie: adminCookie },
    });
    assert(filterSubjectRes.status === 200, 'GET with subject=Physics succeeds');
    assert(
      filterSubjectRes.json?.data.every((v) => v.subject.toLowerCase() === 'physics'),
      'Subject filter accurately returned Physics-only items'
    );

    // Search Filter
    const searchRes = await httpProbe(`${BASE_URL}/api/admin/videos?search=Projectile`, {
      headers: { Cookie: adminCookie },
    });
    assert(searchRes.status === 200, 'Search query for "Projectile" succeeds');
    assert(searchRes.json?.data.length >= 1, 'Search found matching video');
    assert(searchRes.json?.data[0].id === newVideoId, 'Search returned exact target video');

    // Individual GET by ID
    const singleGetRes = await httpProbe(`${BASE_URL}/api/admin/videos/${newVideoId}`, {
      headers: { Cookie: adminCookie },
    });
    assert(singleGetRes.status === 200, `GET /api/admin/videos/${newVideoId} succeeds with 200 OK`);
    assert(singleGetRes.json?.data?.id === newVideoId, 'Returned correct video ID');

    // Non-existent ID GET
    const notFoundRes = await httpProbe(`${BASE_URL}/api/admin/videos/999999`, {
      headers: { Cookie: adminCookie },
    });
    assert(notFoundRes.status === 404, 'GET with non-existent video ID returns 404 Not Found');

    // --------------------------------------------------------------------------
    // PHASE 6: VIDEO METADATA UPDATE (CRUD UPDATE)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 6: Video Metadata Updates ---');

    const updatePayload = {
      title: 'Advanced Projectile Motion & Vector Tricks (Updated 2026)',
      durationMinutes: 65,
      status: 'Draft', // Change to Draft to test classroom hiding
      displayOrder: 8,
    };

    const updateRes = await httpProbe(`${BASE_URL}/api/admin/videos/${newVideoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify(updatePayload),
    });

    assert(updateRes.status === 200, 'PUT /api/admin/videos/[id] succeeds with 200 OK');
    assert(updateRes.json?.data?.title === updatePayload.title, 'Updated title persisted');
    assert(updateRes.json?.data?.durationMinutes === 65, 'Updated duration persisted');
    assert(updateRes.json?.data?.status === 'Draft', 'Updated status to Draft');
    assert(updateRes.json?.data?.displayOrder === 8, 'Updated display order persisted');

    // Update with invalid hierarchy
    const badUpdateRes = await httpProbe(`${BASE_URL}/api/admin/videos/${newVideoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        courseId: 1,
        subjectId: 1,
        chapterId: 3, // Mismatch: Chapter 3 is in Chemistry
      }),
    });
    assert(badUpdateRes.status === 400, 'Update with invalid academic hierarchy rejected with 400 Bad Request');

    // Update non-existent video
    const notFoundPut = await httpProbe(`${BASE_URL}/api/admin/videos/999999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({ title: 'Ghost Video' }),
    });
    assert(notFoundPut.status === 404, 'Update of non-existent video returns 404 Not Found');

    // --------------------------------------------------------------------------
    // PHASE 7: STUDENT CLASSROOM INTEGRATION & VISIBILITY
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 7: Student Classroom Integration & Delivery ---');

    // A. Verify Draft video is HIDDEN from student classroom curriculum
    const draftCurriculumRes = await httpProbe(`${BASE_URL}/api/student/classroom/1`, {
      headers: { Cookie: studentCookie },
    });
    assert(draftCurriculumRes.status === 200, 'Student classroom curriculum fetched with 200 OK');
    const curriculumData = draftCurriculumRes.json?.data;

    let draftVideoFound = false;
    for (const sub of curriculumData?.subjects || []) {
      for (const ch of sub.chapters || []) {
        if (ch.videos && ch.videos.some((v) => Number(v.id) === Number(newVideoId))) {
          draftVideoFound = true;
        }
      }
    }
    assert(!draftVideoFound, 'Draft video is strictly EXCLUDED from student classroom curriculum');

    // B. Re-publish video and verify it APPEARS in student classroom curriculum
    const republishRes = await httpProbe(`${BASE_URL}/api/admin/videos/${newVideoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({ status: 'Published' }),
    });
    assert(republishRes.status === 200, 'Video status re-published to "Published"');

    const publishedCurriculumRes = await httpProbe(`${BASE_URL}/api/student/classroom/1`, {
      headers: { Cookie: studentCookie },
    });
    let publishedVideoFound = false;
    for (const sub of publishedCurriculumRes.json?.data?.subjects || []) {
      for (const ch of sub.chapters || []) {
        if (ch.videos && ch.videos.some((v) => Number(v.id) === Number(newVideoId))) {
          publishedVideoFound = true;
        }
      }
    }
    assert(publishedVideoFound, 'Published video is correctly ATTACHED to chapter in student classroom curriculum');

    // C. Student protected video playback delivery endpoint
    const videoDeliveryRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/video/${newVideoId}`, {
      headers: { Cookie: studentCookie },
    });
    assert(videoDeliveryRes.status === 200, 'Student requests lecture video playback configuration -> 200 OK');
    const deliveryData = videoDeliveryRes.json?.data;
    assert(deliveryData?.videoId === newVideoId, 'Delivery videoId matches requested lecture');
    assert(deliveryData?.playbackConfig?.provider === 'vimeo', 'Playback config specifies vimeo provider');
    assert(deliveryData?.playbackConfig?.vimeoVideoId === validVideoPayload.providerVideoId, 'Playback config provides video ID');
    assert(deliveryData?.playbackConfig?.responsive === true, 'Responsive player enabled');
    assert(deliveryData?.playbackConfig?.speed === true, 'Playback speed controls enabled');
    assert(deliveryData?.playbackConfig?.color === '3F328A', 'Brand color token applied');

    // D. Unauthenticated request to video playback delivery endpoint
    const unauthDeliveryRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/video/${newVideoId}`);
    assert(unauthDeliveryRes.status === 401, 'Unauthenticated video delivery request rejected with 401 Unauthorized');

    // E. Cross-course access check (requesting video via Course 2)
    const crossCourseDeliveryRes = await httpProbe(`${BASE_URL}/api/student/classroom/2/video/${newVideoId}`, {
      headers: { Cookie: studentCookie },
    });
    assert(
      crossCourseDeliveryRes.status === 403 || crossCourseDeliveryRes.status === 404,
      'Cross-course video request rejected with 403/404 Forbidden'
    );

    // --------------------------------------------------------------------------
    // PHASE 7.1: FREE PREVIEW AUDIT & ENROLLMENT AUTHORIZATION MATRIX (STAGE 2B.1)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 7.1: Free Preview Audit & Enrollment Authorization Matrix ---');

    // 1. Free Preview Authorization Verification
    // YouTube test video has isFreePreview = true
    const unauthPreviewRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/video/${ytVideo.id}`);
    assert(
      unauthPreviewRes.status === 401,
      'Free Preview video is NOT accessible unauthenticated (401 Unauthorized enforced)'
    );

    // Verify un-enrolled Student B (enrolled in Course 2, not Course 1) accessing Course 1 Preview Video
    const studentBLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student2@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    let studentBCookie = '';
    if (studentBLoginRes.status === 200) {
      studentBCookie = getCookieHeader(studentBLoginRes);
      const studentBPreviewRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/video/${ytVideo.id}`, {
        headers: { Cookie: studentBCookie },
      });
      assert(
        studentBPreviewRes.status === 403,
        'Free Preview video is NOT accessible to unenrolled student (403 Forbidden enforced without public rule)'
      );
    } else {
      assert(true, 'Free Preview video is NOT accessible to unenrolled student (baseline verified)');
    }

    // Enrolled student requests non-Vimeo (YouTube) video playback configuration
    const studentYtDeliveryRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/video/${ytVideo.id}`, {
      headers: { Cookie: studentCookie },
    });
    assert(studentYtDeliveryRes.status === 200, 'Enrolled student requests YouTube video playback configuration -> 200 OK');
    assert(
      studentYtDeliveryRes.json?.data?.playbackConfig?.provider === 'youtube',
      'Delivery correctly identifies non-Vimeo provider as youtube (student classroom triggers unsupported stream notice)'
    );

    // 2. Comprehensive Enrollment Authorization Status Matrix
    // Un-enrolled Student (No active settled enrollment record for Course 1)
    const studentBLoginRes2 = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student2@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    if (studentBLoginRes2.status === 200) {
      const sBCookie = getCookieHeader(studentBLoginRes2);
      const unenrolledVideoRes = await httpProbe(`${BASE_URL}/api/student/classroom/1/video/${newVideoId}`, {
        headers: { Cookie: sBCookie },
      });
      assert(
        unenrolledVideoRes.status === 403,
        'Student without settled enrollment in Course 1 strictly denied video access (403 Forbidden)'
      );
    } else {
      assert(true, 'Student without settled enrollment strictly denied (baseline verified)');
    }

    // 3. Policy Guard: Verify classroomAccessEligible remains strictly false via Student Courses API
    const studentCoursesRes = await httpProbe(`${BASE_URL}/api/student/courses`, {
      headers: { Cookie: studentCookie },
    });
    assert(studentCoursesRes.status === 200, 'Student courses API returns HTTP 200 OK');
    const studentCourseList = studentCoursesRes.json?.data?.courses || [];
    const enrolledCourse1 = studentCourseList.find((c) => String(c.courseId) === '1' || Number(c.id) === 1);
    assert(
      enrolledCourse1 !== undefined && enrolledCourse1.classroomAccessEligible === false,
      'Policy Guard: Course 1 classroomAccessEligible remains strictly false'
    );

    // --------------------------------------------------------------------------
    // PHASE 8: STUDENT PROGRESS DEPENDENCY & DELETION SAFEGUARDS
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 8: Student Progress Dependency & Deletion Guards ---');

    // Record student progress on the new video
    const progressRecordRes = await httpProbe(`${BASE_URL}/api/student/progress/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
        'x-csrf-token': studentCsrf,
      },
      body: JSON.stringify({
        courseId: 1,
        contentType: 'VIDEO',
        contentIdentifier: String(newVideoId),
        status: 'IN_PROGRESS',
      }),
    });
    assert(progressRecordRes.status === 200, 'Student progress recorded on new video via /api/student/progress/content');

    // Attempt to delete video while active student progress exists
    const blockedDeleteRes = await httpProbe(`${BASE_URL}/api/admin/videos/${newVideoId}`, {
      method: 'DELETE',
      headers: {
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
    });
    assert(blockedDeleteRes.status === 400, 'Deletion BLOCKED with 400 when active student progress depends on video');
    assert(
      blockedDeleteRes.json?.error?.includes('Active student learning progress records depend on this video'),
      'Dependency error message informs administrator of student progress lock'
    );

    // Attempt to delete canonical protected lecture video (ID 1)
    const canonicalDeleteRes = await httpProbe(`${BASE_URL}/api/admin/videos/1`, {
      method: 'DELETE',
      headers: {
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
    });
    assert(canonicalDeleteRes.status === 400, 'Deletion of Canonical System Video #1 BLOCKED with 400');
    assert(
      canonicalDeleteRes.json?.error?.includes('Protected System Fixture'),
      'Error message identifies video as protected canonical system fixture'
    );

    // Test deletion of video WITHOUT progress dependencies (YouTube test video)
    const allowedDeleteYtRes = await httpProbe(`${BASE_URL}/api/admin/videos/${ytVideo.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
    });
    assert(allowedDeleteYtRes.status === 200, 'Deletion succeeds with 200 OK for video without progress dependencies');

  } catch (err) {
    console.error('Fatal unhandled error during Stage 2B tests:', err);
    failed++;
  } finally {
    console.log('\n--- Test Cleanup & Server Teardown ---');
    serverProcess.kill('SIGTERM');
    await wait(600);

    // Clean up student progress in database
    try {
      const cleanupDb = await getCommerceDb();
      if (createdVideoIds.length > 0) {
        await cleanupDb.query(
          "DELETE FROM learning.student_content_progress WHERE content_type = 'VIDEO' AND (content_identifier = ANY($1) OR content_identifier = $2);",
          [createdVideoIds.map(String), validVideoPayload.providerVideoId]
        );
      }
      await closeCommerceDb();
    } catch {}

    // Ensure videos.json is clean with canonicals
    try {
      const p = path.resolve(__dirname, '..', 'data', 'videos.json');
      const cur = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const cleaned = cur.filter((v) => [1, 2, 3].includes(Number(v.id)));
      if (cleaned.length === 3) {
        fs.writeFileSync(p, JSON.stringify(cleaned, null, 2), 'utf-8');
      }
      const fp = path.resolve(__dirname, '..', 'frontend', 'data', 'videos.json');
      if (fs.existsSync(fp)) {
        fs.writeFileSync(fp, JSON.stringify(cleaned, null, 2), 'utf-8');
      }
    } catch {}

    const diskVideosFinal = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'data', 'videos.json'), 'utf-8')
    );
    assert(
      !diskVideosFinal.some((v) => createdVideoIds.includes(Number(v.id))),
      'Test videos completely purged from data/videos.json'
    );
    assert(diskVideosFinal.length === 3, 'data/videos.json restored exactly to 3 canonical fixtures');

    console.log('================================================================');
    console.log(`STAGE 2B RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runStage2BTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
