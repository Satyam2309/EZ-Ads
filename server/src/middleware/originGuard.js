/**
 * CSRF defense-in-depth (Phase 7).
 *
 * The session cookie is httpOnly + SameSite=Lax, which already blocks
 * cross-site POSTs from carrying the session. This middleware adds an
 * Origin/Referer origin check on top: any *state-changing* request whose
 * origin does not match CLIENT_ORIGIN is rejected, even if the cookie
 * policy ever loosens.
 *
 * Non-browser clients (tests, scripts, server-to-server) send no Origin at
 * all and are unaffected — they cannot ambush someone else's cookie anyway.
 */
import { forbidden } from '../utils/errors.js';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(header) {
  try {
    // header value may be a bare origin (Origin) or a full URL (Referer)
    return new URL(header, 'http://fallback.invalid').origin;
  } catch {
    // unparseable header on a state-changing request — treat as foreign
    return null;
  }
}

export function originGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const header = req.headers.origin || req.headers.referer;
  if (!header) return next(); // non-browser client
  const origin = originOf(header);
  const allowed = originOf(env.CLIENT_ORIGIN);
  if (allowed && origin === allowed) return next();
  return next(forbidden('Cross-origin state-changing request blocked', 'ORIGIN_MISMATCH'));
}

export default originGuard;
