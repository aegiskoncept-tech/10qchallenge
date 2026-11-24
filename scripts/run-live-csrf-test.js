const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = '3099';
const rootDir = path.resolve(__dirname, '..');

async function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/auth/csrf`, (res) => {
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(500, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return false;
}

async function main() {
  console.log('[Test Harness] Starting local production Next.js server on port ' + PORT + '...');

  const serverProc = spawn('node', ['frontend/server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false', // Testing over local HTTP
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProc.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Ready') || s.includes('started') || s.includes('Listening')) {
      console.log(`[Server stdout] ${s.trim()}`);
    }
  });

  serverProc.stderr.on('data', (d) => {
    console.error(`[Server stderr] ${d.toString().trim()}`);
  });

  try {
    const isReady = await waitForPort(PORT, 20000);
    if (!isReady) {
      throw new Error('Server failed to start within 20 seconds on port ' + PORT);
    }
    console.log('[Test Harness] Server is listening and responding on port ' + PORT + '. Executing test suite...\n');

    // Run test script
    await new Promise((resolve, reject) => {
      const testProc = spawn('node', ['scripts/test-csrf-validation.js'], {
        cwd: rootDir,
        env: {
          ...process.env,
          PORT,
        },
        stdio: 'inherit',
      });

      testProc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Test process exited with code ${code}`));
      });
      testProc.on('error', reject);
    });

    console.log('[Test Harness] All live CSRF validation tests passed successfully!');
  } finally {
    console.log('[Test Harness] Shutting down test server...');
    serverProc.kill('SIGTERM');
    try {
      process.kill(serverProc.pid);
    } catch {}
  }
}

main().catch((err) => {
  console.error('[Test Harness Error]', err);
  process.exit(1);
});
