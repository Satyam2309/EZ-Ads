/**
 * Test launcher — guarantees the whole runner (and every module it loads)
 * sees NODE_ENV=test BEFORE any app module is imported. Setting it inside
 * a test file is too late: ES imports are hoisted and evaluated first, so
 * env.js would snapshot 'development' and tests would silently run against
 * the developer database and lose test-only behaviors (dev mailbox, etc).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const serverDir = resolve(dirname(__filename), '..');

process.env.NODE_ENV = 'test';
process.env.OAUTH_MOCK_MODE = 'true';

const testArgs = process.argv.slice(2);
const targets = testArgs.length > 0 ? testArgs : ['tests/**/*.test.js'];

const result = spawnSync('node', ['--test', ...targets], {
  cwd: serverDir,
  stdio: 'inherit',
  env: process.env,
  shell: true // Windows-safe resolution of the child `node`
});

process.exit(result.status ?? 1);
