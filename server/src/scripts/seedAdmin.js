/**
 * Admin provisioning — NEVER exposed through a public endpoint.
 *
 * Usage:
 *   npm run seed:admin -- --email ops@ezads.example --password 'Str0ngPass!' [--name "Ops Admin"] [--reset]
 *
 * Or supply ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME via environment.
 *
 * Rules:
 *   - refuses a missing/too-weak password — there is no default admin credential
 *   - production requires ≥ 12 chars with letters and numbers
 *   - idempotent: an existing admin is left untouched unless --reset is passed,
 *     in which case ONLY its password is replaced (role/status never change)
 *   - every provisioning attempt is written to the append-only audit log
 */
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, AuditLog } from '../models/index.js';

const BCRYPT_ROUNDS = 12;

export async function seedAdmin({ email, password, displayName = 'Platform Admin', reset = false }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid --email (or ADMIN_EMAIL) is required');
  }
  if (!password || password.length < 8) {
    throw new Error('Refusing to provision an admin without a real password (≥ 8 chars). There is no default credential.');
  }
  const prod = process.env.NODE_ENV === 'production';
  if (prod && (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
    throw new Error('Production admin passwords must be ≥ 12 chars and include letters and numbers');
  }

  await connectDB();
  const normalized = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalized, role: 'admin' });

  if (existing && !reset) {
    console.log(`[seed:admin] admin ${normalized} already exists — no change (pass --reset to update the password)`);
    return { created: false, updated: false, email: normalized };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  if (existing) {
    user = await User.findOneAndUpdate(
      // password-only reset; role/status are deliberately not touched here
      { _id: existing._id },
      { $set: { passwordHash } },
      { new: true }
    );
    console.log(`[seed:admin] password reset for existing admin ${normalized}`);
  } else {
    user = await User.create({
      role: 'admin',
      email: normalized,
      passwordHash,
      displayName,
      emailVerified: true // admins do not go through email verification
    });
    console.log(`[seed:admin] admin created: ${normalized} (${user._id})`);
  }

  // system actor writes its own provisioning record (actor: null)
  await AuditLog.create({
    actor: user._id,
    action: existing ? 'admin.provisioned.password_reset' : 'admin.provisioned.created',
    targetType: 'user',
    targetId: user._id,
    meta: { email: normalized, source: 'seedAdmin script' }
  });

  return { created: !existing, updated: Boolean(existing), email: normalized, id: user._id };
}

/* -------- CLI mode -------- */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : undefined;
  };
  try {
    const result = await seedAdmin({
      email: flag('--email') || process.env.ADMIN_EMAIL || process.env.ADMIN_INITIAL_EMAIL,
      password: flag('--password') || process.env.ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD,
      displayName: flag('--name') || process.env.ADMIN_NAME || 'Platform Admin',
      reset: args.includes('--reset')
    });
    await disconnectDB();
    console.log(result.id ? `[seed:admin] done — admin id: ${result.id}` : '[seed:admin] done');
    process.exit(0);
  } catch (err) {
    console.error('[seed:admin] FAILED:', err.message);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
}
