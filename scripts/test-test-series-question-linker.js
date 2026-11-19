// ==============================================================================
// 10Q CHALLENGE LMS — STAGE 3.5 QA TEST SUITE
// Test Series Question Linker Full Integration & Preservation Test
// ==============================================================================

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const PORT = 3012;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashFile(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
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
        text: '',
        json: null,
        headers: {},
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function getCookieHeader(probeRes) {
  const raw = probeRes.headers['set-cookie'];
  if (!raw) return '';
  return Array.isArray(raw)
    ? raw.map((c) => c.split(';')[0]).join('; ')
    : raw.split(';')[0];
}

function getCsrfFromProbe(probeRes) {
  const raw = probeRes.headers['set-cookie'] || [];
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const c of cookies) {
    const match = c.match(/10q_csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

async function runQuestionLinkerTests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — STAGE 3.5 QUESTION LINKER QA SUITE');
  console.log('API Verification, Filtering, Concurrency & Attempt Preservation');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // --- Phase 0: Baseline Verification of Existing 12 Attempts ---
  console.log('--- Phase 0: Baseline Verification of Existing 12 Attempts ---');
  const attemptsPath = path.resolve(__dirname, '..', 'data', 'test-attempts.json');
  assert(fs.existsSync(attemptsPath), 'data/test-attempts.json exists on disk');
  const initialAttemptsHash = hashFile(attemptsPath);
  console.log(`  [BASELINE] Initial attempts SHA-256: ${initialAttemptsHash}`);
  assert(
    initialAttemptsHash === '8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e',
    'Initial attempts SHA-256 matches canonical protected baseline exactly'
  );

  const initialAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
  assert(initialAttempts.length === 12, 'Exactly 12 baseline attempts found');
  const completedAtt = initialAttempts.find((a) => a.status === 'COMPLETED');
  assert(completedAtt && completedAtt.result.finalScore === 6, 'Completed attempt #11 score strictly 6/15');

  // Launch test server
  console.log(`\nStarting test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('error') || s.includes('Error')) console.log('[Server stdout]', s.trim());
  });
  serverProcess.stderr.on('data', (d) => {
    console.error('[Server stderr]', d.toString().trim());
  });

  // Wait for server readiness
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await wait(500);
    const probe = await httpProbe(`${BASE_URL}/api/auth/me`);
    if (probe.status === 401 || probe.status === 200) {
      serverReady = true;
      break;
    }
  }
  assert(serverReady, `Test server is online and listening on port ${PORT}`);

  try {
    // --- Phase 1: Security & Unauthenticated Access ---
    console.log('\n--- Phase 1: Security & Access Control ---');
    const unauthGet = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`);
    assert(
      unauthGet.status === 401 || unauthGet.status === 403,
      `Unauthenticated GET /api/admin/test-series/2/questions is blocked (${unauthGet.status})`
    );

    const unauthPut = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: [1, 2] }),
    });
    assert(
      unauthPut.status === 401 || unauthPut.status === 403,
      `Unauthenticated PUT /api/admin/test-series/2/questions is blocked (${unauthPut.status})`
    );

    // --- Phase 2: Administrator Authentication ---
    console.log('\n--- Phase 2: Administrator Login ---');
    const loginProbe = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@10qchallenge.in',
        password: 'AdminPass2026!',
      }),
    });

    assert(loginProbe.status === 200, 'Admin login succeeded');
    const adminCookies = getCookieHeader(loginProbe);
    const csrfToken = getCsrfFromProbe(loginProbe);
    assert(!!adminCookies, 'Admin auth cookies obtained');
    assert(!!csrfToken, 'Admin CSRF token obtained');

    const authHeaders = {
      Cookie: adminCookies,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    };

    // --- Phase 3: GET /api/admin/test-series/[id]/questions Data & Filters ---
    console.log('\n--- Phase 3: GET Question Linker API & Metadata ---');
    // Using Paper #2 (BITSAT 2026 Full Syllabus CBT Mock 02) to keep Paper #1 completely pristine
    const getRes = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      headers: authHeaders,
    });

    assert(getRes.status === 200, `GET /api/admin/test-series/2/questions returned 200 OK (${getRes.status})`);
    assert(getRes.json && getRes.json.success === true, 'Response JSON success is true');

    const data = getRes.json.data;
    assert(data.paper && data.paper.id === 2, `Paper metadata matches ID 2 (${data.paper?.title})`);
    assert(data.paper.markingScheme !== undefined, 'Paper has markingScheme defined');
    assert(Array.isArray(data.linkedQuestions), `linkedQuestions is an array (${data.linkedQuestions?.length} items)`);
    assert(Array.isArray(data.availableQuestions), `availableQuestions is an array (${data.availableQuestions?.length} items)`);
    assert(Array.isArray(data.subjects) && data.subjects.length > 0, `Active subjects list returned (${data.subjects?.length} subjects)`);
    assert(Array.isArray(data.chapters) && data.chapters.length > 0, `Active chapters list returned (${data.chapters?.length} chapters)`);
    assert(data.metrics && data.metrics.totalQuestions === data.linkedQuestions.length, 'Metrics totalQuestions matches linked questions count');

    // Test Subject filter
    if (data.subjects.length > 0) {
      const targetSub = data.subjects[0];
      const filteredRes = await httpProbe(
        `${BASE_URL}/api/admin/test-series/2/questions?subjectId=${targetSub.id}`,
        { headers: authHeaders }
      );
      assert(filteredRes.status === 200, `GET with ?subjectId=${targetSub.id} returned 200`);
      const subQuestions = filteredRes.json.data.availableQuestions;
      assert(
        subQuestions.every((q) => Number(q.subjectId) === Number(targetSub.id)),
        `All filtered available questions belong to subject ${targetSub.id}`
      );
    }

    // Test Type filter
    const typeRes = await httpProbe(
      `${BASE_URL}/api/admin/test-series/2/questions?type=numerical`,
      { headers: authHeaders }
    );
    assert(typeRes.status === 200, 'GET with ?type=numerical returned 200');
    assert(
      typeRes.json.data.availableQuestions.every((q) => q.questionType === 'numerical'),
      'All filtered questions are numerical type'
    );

    // --- Phase 4: PUT Updates, Reordering, Marking Scheme ---
    console.log('\n--- Phase 4: PUT Question Linking, Reordering & Concurrency ---');

    // 4.1 Reject non-existent question IDs
    const invalidPut = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        questionIds: [1, 999999],
      }),
    });
    assert(invalidPut.status === 400, `Reject non-existent question ID with 400 (got ${invalidPut.status})`);

    // 4.2 Concurrency conflict rejection
    const conflictPut = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        questionIds: [1, 2, 3],
        expectedVersion: 999, // Intentional mismatch
      }),
    });
    assert(conflictPut.status === 409, `Reject version mismatch with 409 Conflict (got ${conflictPut.status})`);

    // 4.3 Successful reorder and marking update on Paper #2
    const currentVer = data.paper.version || 1;
    const reorderedIds = [3, 1, 2];
    const updateRes = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        questionIds: reorderedIds,
        markingScheme: { positiveMarks: 4, negativeMarks: 1 },
        expectedVersion: currentVer,
      }),
    });

    assert(updateRes.status === 200, `Successfully saved linked questions on Paper #2 (${updateRes.status})`);
    assert(updateRes.json && updateRes.json.success === true, 'Update returned success: true');
    assert(
      JSON.stringify(updateRes.json.data.testSeries.questionIds) === JSON.stringify(reorderedIds),
      `Updated question IDs match reordered list: [${reorderedIds.join(', ')}]`
    );
    assert(
      updateRes.json.data.testSeries.totalMarks === reorderedIds.length * 4,
      `Recalculated total marks: ${updateRes.json.data.testSeries.totalMarks} (expected: ${reorderedIds.length * 4})`
    );

    // Re-query to verify persistence
    const verifyGet = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      headers: authHeaders,
    });
    const savedIds = verifyGet.json.data.linkedQuestions.map((q) => q.id);
    assert(
      JSON.stringify(savedIds) === JSON.stringify(reorderedIds),
      `GET verification confirms exact ordered IDs: [${savedIds.join(', ')}]`
    );

    // Restore Paper #2 to canonical [1, 2, 3, 4, 5] with marking 3/1
    const restoreRes = await httpProbe(`${BASE_URL}/api/admin/test-series/2/questions`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        questionIds: [1, 2, 3, 4, 5],
        markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      }),
    });
    assert(restoreRes.status === 200, 'Paper #2 restored to canonical 5 questions state');

    // --- Phase 5: SQLite Admin Activity Audit Log ---
    console.log('\n--- Phase 5: Admin Activity Audit Log Verification ---');
    const authDbPath = path.resolve(__dirname, '..', 'database', '10q_auth_dev.db');
    const authDb = new DatabaseSync(authDbPath, { readOnly: true });
    const recentLogs = authDb
      .prepare(
        "SELECT * FROM admin_activity_logs WHERE action = 'UPDATE_TEST_QUESTIONS' ORDER BY id DESC LIMIT 5"
      )
      .all();
    assert(recentLogs.length > 0, `Found ${recentLogs.length} UPDATE_TEST_QUESTIONS audit log entries in SQLite`);
    if (recentLogs.length > 0) {
      assert(recentLogs[0].entityId === '2', `Audit log recorded correct target entity ID (${recentLogs[0].entityId})`);
    }

    // --- Phase 6: Final Strict Baseline Hash Verification ---
    console.log('\n--- Phase 6: Final Baseline Protection Verification ---');
    const finalHash = hashFile(attemptsPath);
    console.log(`  [POST-TEST] Final attempts SHA-256: ${finalHash}`);
    assert(
      finalHash === initialAttemptsHash,
      'Final test-attempts.json SHA-256 is 100% IDENTICAL to baseline hash'
    );
    assert(
      finalHash === '8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e',
      'Baseline SHA-256 remains strictly 8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e'
    );

    const finalAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    assert(finalAttempts.length === 12, 'All 12 attempts intact');
    const finalComp = finalAttempts.find((a) => a.status === 'COMPLETED');
    assert(finalComp.result.finalScore === 6, 'Completed attempt score remains strictly 6/15');
  } finally {
    // Kill server cleanly
    console.log('\nStopping test server...');
    serverProcess.kill('SIGTERM');
    await wait(1000);
  }

  console.log('\n================================================================');
  console.log(`STAGE 3.5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQuestionLinkerTests().catch((err) => {
  console.error('[FATAL ERROR IN TEST SUITE]', err);
  process.exit(1);
});
