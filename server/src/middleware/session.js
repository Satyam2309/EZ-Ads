import { env, isProd } from '../config/env.js';
import { verifySessionToken, signSessionToken } from '../utils/tokens.js';
import { User } from '../models/index.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export const SESSION_COOKIE = 'ezads_session';
const base = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd, // HTTPS-only in production
  path: '/'
};

/** Attach req.user when a valid session cookie is present. */
export async function attachUser(req, _res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return next();
    const decoded = verifySessionToken(token);
    if (!decoded) return next();
    const user = await User.findById(decoded.sub).select('+passwordHash');
    if (user && user.status === 'active') req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Endpoints that require an authenticated, active user. */
export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

/** Role gate. Usage: requireRole('brand') or requireRole('admin', 'brand'). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`This endpoint requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

export function setSessionCookie(res, user) {
  res.cookie(SESSION_COOKIE, signSessionToken(user), { ...base, maxAge: 7 * 24 * 3600 * 1000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, base);
}
