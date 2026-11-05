/**
 * Test launcher — guarantees the whole runner (and every module it loads)
 * sees NODE_ENV=test BEFORE any app module is imported. Setting it inside
 * a test file is too late: ES imports are hoisted and evaluated first, so
 * env.js would snapshot 'development' and tests would silently run against
 * the developer database and lose test-only behaviors (dev mailbox, etc).
 */
import { spawnSync } from 'node:child_process';

process.env.NODE_ENV = 'test';

// `node --test tests` executes every test file, concurrently, as `npm test` did.
const result = spawnSync('node', ['--test', 'tests/**/*.test.js'], {
  stdio: 'inherit',
  env: process.env,
  shell: true // Windows-safe resolution of the child `node`
});

process.exit(result.status ?? 1);
