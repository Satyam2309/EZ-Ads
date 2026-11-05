import {
  registerBrand, loginBrand, loginAdmin, verifyEmail, requestPasswordReset, resetPassword
} from '../services/authService.js';
import {
  buildAuthorizeUrl, exchangeCodeForIdentity, mockIdentity, upsertInfluencerFromIdentity, oauthMode
} from '../services/instagramOAuth.js';
import { signState, verifyState } from '../services/oauthState.js';
import { setSessionCookie, clearSessionCookie } from '../middleware/session.js';
import { badRequest, unauthorized, AppError } from '../utils/errors.js';
import { env, isProd, oauthMockMode } from '../config/env.js';
import { latestDevToken } from '../services/devMailbox.js';

/* ---------------- Brand auth ---------------- */

export async function registerBrandHandler(req, res) {
  const user = await registerBrand(req.body, req);
  // session granted immediately; API access gated by emailVerified in middleware
  setSessionCookie(res, user);
  res.status(201).json({
    ok: true,
    data: { id: user._id, email: user.email, emailVerified: false, role: 'brand' }
  });
}

export async function loginBrandHandler(req, res) {
  const user = await loginBrand(req.body.email, req.body.password, req);
  setSessionCookie(res, user);
  res.json({
    ok: true,
    data: { id: user._id, email: user.email, emailVerified: user.emailVerified, role: user.role }
  });
}

export async function loginAdminHandler(req, res) {
  const user = await loginAdmin(req.body.email, req.body.password, req);
  setSessionCookie(res, user);
  res.json({
    ok: true,
    data: { id: user._id, email: user.email, role: user.role, displayName: user.displayName }
  });
}

export async function logoutHandler(req, res) {
  clearSessionCookie(res);
  res.json({ ok: true, data: { loggedOut: true } });
}

export async function meHandler(req, res) {
  const u = req.user;
  res.json({
    ok: true,
    data: {
      id: u._id,
      role: u.role,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      status: u.status,
      instagram: u.role === 'influencer'
        ? {
            username: u.instagram?.username,
            connected: Boolean(u.instagram?.providerId),
            accountType: u.instagram?.accountType,
            reauthRequired: u.instagram?.reauthRequired,
            isMock: Boolean(u.instagram?.isMock)
          }
        : undefined
    }
  });
}

export async function verifyEmailHandler(req, res) {
  const user = await verifyEmail(req.query.token);
  res.json({ ok: true, data: { email: user.email, emailVerified: true } });
}

export async function requestPasswordResetHandler(req, res) {
  await requestPasswordReset(req.body.email);
  // identical response whether or not the account exists (no enumeration)
  res.json({ ok: true, data: { message: 'If that email is registered, a reset link has been sent.' } });
}

export async function resetPasswordHandler(req, res) {
  await resetPassword(req.body.token, req.body.password);
  res.json({ ok: true, data: { message: 'Password updated. You can now log in.' } });
}

/**
 * DEV ONLY — simulated mailbox. When no SMTP is configured (the common local
 * dev/test state), email tokens land in an in-memory inbox so flows are
 * completable in the UI instead of dead-ending at the server console.
 * 404s in production; storage only fills when email is not configured.
 */
export function devMailboxHandler(req, res) {
  if (isProd) return next404(res);
  const email = String(req.query.email || '').toLowerCase().trim().slice(0, 200);
  const token = email ? latestDevToken.get(email) || null : null;
  res.json({
    ok: true,
    data: { email, token, labeled: 'DEVELOPMENT MAILBOX — simulates the email inbox, memory-only, disabled in production' }
  });
}

/* ------------- Instagram OAuth (influencer) ------------- */

export function instagramStartHandler(req, res) {
  const state = signState('instagram_login');
  if (oauthMockMode) {
    // Describe the mock flow contract; the client redirects to /mock-auth page.
    return res.json({ ok: true, data: { mode: 'mock', state, authorizeUrl: null } });
  }
  res.json({ ok: true, data: { mode: 'live', state, authorizeUrl: buildAuthorizeUrl(state) } });
}

export async function instagramMockCallbackHandler(req, res) {
  if (!oauthMockMode) return next404(res);
  const { state, mockUser } = req.body;
  const stateData = verifyState(state); // throws on invalid/expired/replayed
  if (stateData.intent !== 'instagram_login') throw badRequest('State intent mismatch');
  const identity = await mockIdentity({ mockUser });
  const user = await upsertInfluencerFromIdentity(identity, req);
  setSessionCookie(res, user);
  res.json({
    ok: true,
    data: {
      id: user._id,
      role: user.role,
      displayName: user.displayName,
      instagram: { username: identity.username, isMock: true, mode: 'mock' }
    }
  });
}

export async function instagramCallbackHandler(req, res) {
  // Meta redirects here with ?code=...&state=... — browser GET
  const { code, state, error, error_description: errorDescription } = req.query;
  const fail = (msg, detail) =>
    res.redirect(`${env.CLIENT_ORIGIN}/auth/instagram/callback?status=error&message=${encodeURIComponent(msg)}${detail ? `&detail=${encodeURIComponent(detail)}` : ''}`);

  try {
    if (error) return fail('Authorization denied', errorDescription || error);
    if (!code || !state) return fail('Missing authorization response');

    const stateData = verifyState(state); // SIG + TTL + replay checks
    if (stateData.intent !== 'instagram_login') return fail('State intent mismatch');

    if (oauthMockMode) return fail('Live callback in mock mode — use the mock flow');

    const identity = await exchangeCodeForIdentity(code);
    const user = await upsertInfluencerFromIdentity(identity, req);
    setSessionCookie(res, user);
    return res.redirect(`${env.CLIENT_ORIGIN}/auth/instagram/callback?status=success`);
  } catch (err) {
    if (err instanceof AppError && err.status < 500) return fail(err.message);
    console.error('[oauth] callback error:', err.message);
    return fail('Instagram connection failed — try again');
  }
}

function next404(res) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
