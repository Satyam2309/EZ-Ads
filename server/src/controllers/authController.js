import {
  registerBrand, registerCreator, loginBrand, loginCreator, loginAdmin, verifyEmail, requestPasswordReset, resetPassword,
  getOwnAccount, updateOwnAccount, changeOwnPassword, resendVerificationEmail
} from '../services/authService.js';
import {
  buildAuthorizeUrl, exchangeCodeForIdentity, mockIdentity, upsertInfluencerFromIdentity, oauthMode
} from '../services/instagramOAuth.js';
import { signState, verifyState } from '../services/oauthState.js';
import { setSessionCookie, clearSessionCookie } from '../middleware/session.js';
import { badRequest, unauthorized, AppError } from '../utils/errors.js';
import { env, isProd, oauthMockMode } from '../config/env.js';
import { latestDevToken } from '../services/devMailbox.js';

/* ---------------- Creator auth ---------------- */

export async function registerCreatorHandler(req, res) {
  const user = await registerCreator(req.body, req);
  setSessionCookie(res, user);
  res.status(201).json({
    ok: true,
    data: { id: user._id, email: user.email, emailVerified: false, role: 'influencer' }
  });
}

export async function loginCreatorHandler(req, res) {
  const user = await loginCreator(req.body.email, req.body.password, req);
  setSessionCookie(res, user);
  res.json({
    ok: true,
    data: { id: user._id, email: user.email, emailVerified: user.emailVerified, role: user.role }
  });
}

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
            connected: Boolean(u.instagram?.username),
            accountType: u.instagram?.accountType,
            reauthRequired: false,
            isMock: false
          }
        : undefined
    }
  });
}

/* ---------------- Own account (settings page) ---------------- */

export async function getAccountHandler(req, res) {
  res.json({ ok: true, data: await getOwnAccount(req.user) });
}

export async function updateAccountHandler(req, res) {
  const result = await updateOwnAccount(req.user, req.body, req);
  res.json({ ok: true, data: result });
}

export async function changePasswordHandler(req, res) {
  const result = await changeOwnPassword(req.user, req.body, req);
  res.json({ ok: true, data: result });
}

export async function verifyEmailHandler(req, res) {
  const user = await verifyEmail(req.query.token);
  res.json({ ok: true, data: { email: user.email, emailVerified: true } });
}

export async function resendVerificationHandler(req, res) {
  const result = await resendVerificationEmail(req.user, req);
  res.json({ ok: true, data: result });
}

export async function requestPasswordResetHandler(req, res) {
  await requestPasswordReset(req.body.email, req);
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

  if (req.user && req.user.role === 'influencer') {
    const { User, InfluencerProfile } = await import('../models/index.js');
    const { encryptSecret } = await import('../utils/tokenCrypto.js');
    const tokenEnc = encryptSecret(identity.accessToken);
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          'instagram.providerId': identity.providerId,
          'instagram.username': identity.username,
          'instagram.accountType': identity.accountType,
          'instagram.accessTokenEnc': tokenEnc,
          'instagram.tokenExpiresAt': new Date(Date.now() + identity.expiresInSeconds * 1000),
          'instagram.connectedAt': new Date(),
          'instagram.reauthRequired': false,
          'instagram.isMock': true
        }
      }
    );
    await InfluencerProfile.updateOne(
      { user: req.user._id },
      {
        $set: {
          'audience.followers': 125430,
          'audience.followersSource': 'meta_api',
          'audience.followersSyncedAt': new Date(),
          'audience.engagementRate': 4.82,
          'audience.engagementSource': 'meta_api',
          instagramInsights: {
            followersCount: 125430,
            mediaCount: 184,
            engagementRate: 4.82,
            avgLikes: 5820,
            avgComments: 215,
            totalReach: 1240000,
            avgReach: 41330,
            totalImpressions: 2870000,
            avgImpressions: 95660,
            profileViews: 86420,
            websiteTaps: 7210,
            newFollows: 3410,
            reachTrend: [
              { date: 'Oct 16', value: 32000 },
              { date: 'Oct 20', value: 36000 },
              { date: 'Oct 24', value: 39000 },
              { date: 'Oct 28', value: 43000 },
              { date: 'Nov 1', value: 41000 },
              { date: 'Nov 5', value: 47000 },
              { date: 'Nov 9', value: 52000 },
              { date: 'Nov 14', value: 58000 }
            ],
            impressionsTrend: [
              { date: 'Oct 16', value: 75000 },
              { date: 'Oct 20', value: 82000 },
              { date: 'Oct 24', value: 90000 },
              { date: 'Oct 28', value: 98000 },
              { date: 'Nov 1', value: 95000 },
              { date: 'Nov 5', value: 110000 },
              { date: 'Nov 9', value: 122000 },
              { date: 'Nov 14', value: 135000 }
            ],
            followersTrend: [
              { date: 'Oct 16', value: 122020 },
              { date: 'Oct 20', value: 122500 },
              { date: 'Oct 24', value: 123100 },
              { date: 'Oct 28', value: 123800 },
              { date: 'Nov 1', value: 124200 },
              { date: 'Nov 5', value: 124700 },
              { date: 'Nov 9', value: 125100 },
              { date: 'Nov 14', value: 125430 }
            ],
            audienceCountry: [
              { country: 'India', pct: 72.4 },
              { country: 'United States', pct: 11.2 },
              { country: 'United Kingdom', pct: 5.8 },
              { country: 'Others', pct: 10.6 }
            ],
            audienceAge: [
              { range: '13–17', pct: 4.1 },
              { range: '18–24', pct: 47.8 },
              { range: '25–34', pct: 35.2 },
              { range: '35–44', pct: 9.4 },
              { range: '45+', pct: 3.5 }
            ],
            audienceGender: { M: 62.1, F: 37.5, U: 0.4 },
            syncedAt: new Date()
          }
        }
      }
    );
    return res.json({ ok: true, data: { connected: true, username: identity.username } });
  }

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

    if (req.user && req.user.role === 'influencer') {
      const { User } = await import('../models/index.js');
      const { encryptSecret } = await import('../utils/tokenCrypto.js');
      const tokenEnc = encryptSecret(identity.accessToken);
      await User.updateOne(
        { _id: req.user._id },
        {
          $set: {
            'instagram.providerId': identity.providerId,
            'instagram.username': identity.username,
            'instagram.accountType': identity.accountType,
            'instagram.accessTokenEnc': tokenEnc,
            'instagram.tokenExpiresAt': new Date(Date.now() + identity.expiresInSeconds * 1000),
            'instagram.connectedAt': new Date(),
            'instagram.reauthRequired': false,
            'instagram.isMock': false
          }
        }
      );
      try {
        const { fetchAndStoreInsights } = await import('../services/instagramInsights.js');
        await fetchAndStoreInsights(req.user._id);
      } catch (err) {
        console.warn('[oauth] initial insights fetch warning:', err.message);
      }
      return res.redirect(`${env.CLIENT_ORIGIN}/auth/instagram/callback?status=connected`);
    }

    const user = await upsertInfluencerFromIdentity(identity, req);
    setSessionCookie(res, user);
    try {
      const { fetchAndStoreInsights } = await import('../services/instagramInsights.js');
      await fetchAndStoreInsights(user._id);
    } catch (err) {
      console.warn('[oauth] initial insights fetch warning:', err.message);
    }
    return res.redirect(`${env.CLIENT_ORIGIN}/auth/instagram/callback?status=success`);
  } catch (err) {
    console.error('[oauth] callback error:', err);
    const msg = err.message || 'Instagram connection failed — try again';
    const detail = err.details?.detail || (err.status ? `Status: ${err.status}` : undefined);
    return fail(msg, detail);
  }
}

function next404(res) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
