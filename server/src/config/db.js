import mongoose from 'mongoose';
import { env, isProd } from './env.js';

/**
 * Test runs MUST NOT touch developer data. NODE_ENV=test forces a dedicated
 * database (same server, `_test` suffix) unless MONGODB_URI was explicitly
 * overridden — so `npm test` never wipes the dev collection again.
 */
function resolveUri() {
  const raw = process.env.MONGODB_URI;
  if (raw && raw.length > 0) return raw;
  // Fail-closed belt & braces: if a test file set TEST_DB_NAME, isolate EVEN IF
  // NODE_ENV somehow reached us as 'development' (import-order bug protection:
  // a test process must never be able to touch the developer database).
  if (env.NODE_ENV === 'test' || process.env.TEST_DB_NAME) {
    // TEST_DB_NAME gives each test file its OWN database — the runner executes
    // files concurrently, and shared fixtures were being wiped by sibling files.
    const suffix = process.env.TEST_DB_NAME ? `_${process.env.TEST_DB_NAME}` : '';
    const base = env.MONGODB_URI.split('?')[0].replace(/\/$/, '');
    const qs = env.MONGODB_URI.includes('?') ? '?' + env.MONGODB_URI.split('?')[1] : '';
    return `${base}_test${suffix}${qs}`;
  }
  return env.MONGODB_URI;
}

function maskUri(uri) {
  try {
    const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'https://'));
    return `${u.protocol}//${u.username ? '***:***@' : ''}${u.host}${u.pathname}`;
  } catch {
    return 'invalid-uri';
  }
}

let connected = false;

export async function connectDB() {
  if (connected) return;
  mongoose.set('strictQuery', true);
  const uri = resolveUri();
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: !isProd
    });
    connected = true;
    console.log(`[db] Connected: ${maskUri(uri)}${uri !== env.MONGODB_URI ? ' (isolated test DB)' : ''}`);
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    console.error('[db] Set MONGODB_URI (Atlas connection string) in server/.env');
  }
}

export async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
  console.log('[db] Disconnected');
}

export function dbState() {
  return mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting
}

/**
 * Explicitly build all registered indexes and wait for completion.
 * Mongoose 8 refuses to replace an index whose name exists but whose options
 * differ (e.g. `unique` added to a schema after an earlier boot built it).
 * Dev/test repair: drop conflicting indexes first, then sync. Comparison is
 * by full definition (key pattern + correct-affecting options), not name.
 * This touches index metadata only — no documents are modified.
 * Production (autoIndex off) should use deliberate migrations.
 */
export async function syncIndexes() {
  for (const model of Object.values(mongoose.models)) {
    const collection = model.collection;
    const desiredIdx = model.schema.indexes().map(([keys, opts = {}]) => ({
      keys,
      name: opts.name ?? Object.entries(keys).map(([f, d]) => `${f}_${d || 1}`).join('_'),
      opts
    }));
    let existing;
    try {
      existing = await collection.indexes();
    } catch (err) {
      // fresh database: the collection (namespace) does not exist yet — nothing to reconcile
      if (err?.code === 26 || /ns does not exist/i.test(err?.message || '')) continue;
      throw err;
    }
    for (const idx of existing) {
      if (idx.name === '_id_') continue;
      const desired = desiredIdx.find((d) => d.name === idx.name);
      if (!desired) continue; // not schema-managed; leave alone
      const optsDiffer =
        Boolean(idx.unique) !== Boolean(desired.opts.unique) ||
        Boolean(idx.sparse) !== Boolean(desired.opts.sparse) ||
        Boolean(idx.partialFilterExpression) !== Boolean(desired.opts.partialFilterExpression);
      if (optsDiffer) {
        console.warn(`[db] rebuilding stale index ${idx.name} on ${collection.collectionName}`);
        await collection.dropIndex(idx.name);
      }
    }
  }
  await mongoose.connection.syncIndexes();
}
