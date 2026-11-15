// Verifies the configured MongoDB connection and reports what it actually hit.
//
// Deployed apps fail with a generic 500 when Mongo is unreachable, so this
// distinguishes the real causes: wrong password, unencoded special characters,
// IP not allowlisted, or a URI pointing at the wrong database.
//
// Usage (from repo root, after saving server/.atlas.env):
//   set -a; . server/.atlas.env; set +a; npm run check:db --prefix server
// Credentials are never printed.
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('[db] MONGODB_URI is not set.');
  console.error('     Set it inline, or `set -a; . server/.atlas.env; set +a` first.');
  process.exit(1);
}

const redacted = uri.replace(/\/\/([^@/]+)@/, '//***:***@');
const started = Date.now();

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const pingStart = Date.now();
  await db.command({ ping: 1 });
  const collections = await db.listCollections().toArray();

  console.log(`[db] connected   ${mongoose.connection.host}`);
  console.log(`[db] database    ${db.databaseName}`);
  console.log(`[db] ping        ${Date.now() - pingStart} ms (connect ${Date.now() - started} ms)`);
  console.log(
    `[db] collections ${collections.length}` +
      (collections.length ? ` (${collections.map((c) => c.name).join(', ')})` : ' — empty, ready for seed')
  );
  if (db.databaseName !== 'ezads') {
    console.warn(`[db] WARN: database is "${db.databaseName}" but the app expects "ezads".`);
    console.warn('     The name comes from the path of the URI, before the "?".');
  }
  await mongoose.disconnect();
} catch (error) {
  console.error(`[db] FAILED ${redacted}`);
  console.error(`[db] ${error.message}`);

  const message = error.message || '';
  if (/Authentication failed|bad auth/i.test(message)) {
    console.error('[db] Hint: wrong db username/password. Check the Database Access user.');
  } else if (/ENOTFOUND|querySrv|ETIMEOUT|getaddrinfo/i.test(message)) {
    console.error('[db] Hint: cluster host unreachable — DNS/SRV blocked, or the cluster is paused.');
  } else if (/IP|allowlist|whitelist|not allowed/i.test(message)) {
    console.error('[db] Hint: allowlist this IP under Atlas → Network Access (0.0.0.0/0 for servers).');
  } else if (/could not connect to server/i.test(message)) {
    console.error('[db] Hint: nothing listening there — check the host and port in the URI.');
  }
  process.exit(1);
}
