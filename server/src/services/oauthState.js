/**
 * OAuth state parameter: HMAC-signed, short-TTL, carries a nonce + intent.
 * Guarantees: callback belongs to a flow we started, cannot be forged
 * (server-side secret), cannot be replayed after success (nonce burn).
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const TTL_MS = 10 * 60 * 1000;
const burned = new Map(); // nonce -> expiry (dev/process-local; Redis in multi-instance prod)

export function signState(intent = 'login') {
  const nonce = randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({ intent, nonce, ts: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', env.OAUTH_STATE_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    throw new AppError('Missing OAuth state', 400, 'OAUTH_STATE_INVALID');
  }
  const [payload, sig] = state.split('.');
  const expected = createHmac('sha256', env.OAUTH_STATE_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError('OAuth state signature mismatch', 400, 'OAUTH_STATE_INVALID');
  }
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    throw new AppError('OAuth state malformed', 400, 'OAUTH_STATE_INVALID');
  }
  if (Date.now() - data.ts > TTL_MS) {
    throw new AppError('OAuth state expired — restart login', 400, 'OAUTH_STATE_EXPIRED');
  }
  if (burned.has(data.nonce)) {
    throw new AppError('OAuth state already used', 400, 'OAUTH_STATE_REPLAY');
  }
  burned.set(data.nonce, Date.now() + TTL_MS);
  if (burned.size > 1000) {
    const now = Date.now();
    for (const [n, exp] of burned) if (exp < now) burned.delete(n);
  }
  return data; // { intent, nonce, ts }
}
