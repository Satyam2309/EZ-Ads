/**
 * Instagram OAuth service — "Instagram API with Instagram Login"
 * (Business Login for Instagram). Verified against Meta docs, Oct 2026:
 *  - authorize: https://www.instagram.com/oauth/authorize
 *      client_id, redirect_uri, response_type=code, scope=instagram_business_basic
 *  - short-lived token: POST https://api.instagram.com/oauth/access_token
 *      (form: client_id, client_secret, grant_type=authorization_code, redirect_uri, code)
 *  - long-lived: GET https://graph.instagram.com/access_token
 *      (grant_type=ig_exchange_token, client_secret, access_token) — 60 days
 *  - profile: GET https://graph.instagram.com/v23.0/me?fields=user_id,username,account_type
 * Tokens are encrypted at rest; secrets never leave the server; the frontend
 * only ever receives our own session cookie.
 */
import { env, oauthMockMode } from '../config/env.js';
import { User, InfluencerProfile, AuditLog } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { encryptSecret, decryptSecret } from '../utils/tokenCrypto.js';
import { signState, verifyState } from './oauthState.js';

const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const LL_TOKEN_URL = 'https://graph.instagram.com/access_token';
const GRAPH_ME = 'https://graph.instagram.com/v23.0/me';

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: env.META_REDIRECT_URI,
    response_type: 'code',
    scope: env.META_SCOPES
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchange authorization code → short-lived → long-lived token + profile. */
export async function exchangeCodeForIdentity(code) {
  const body = new URLSearchParams({
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: env.META_REDIRECT_URI,
    code
  });
  const res = await fetch(TOKEN_URL, { method: 'POST', body });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(`Instagram token exchange failed (${res.status})`, 502, 'OAUTH_TOKEN_EXCHANGE_FAILED', { detail: undefined });
  }
  const short = await res.json(); // { access_token, user_id, permissions }

  // short → long-lived (60 days)
  const ll = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: env.META_APP_SECRET, access_token: short.access_token });
  const llRes = await fetch(`${LL_TOKEN_URL}?${ll}`);
  const longLived = llRes.ok ? await llRes.json() : null;

  // profile permitted by granted scopes
  const meRes = await fetch(`${GRAPH_ME}?fields=user_id,username,account_type&access_token=${encodeURIComponent(short.access_token)}`);
  if (!meRes.ok) throw new AppError('Could not read Instagram profile', 502, 'OAUTH_PROFILE_FAILED');
  const profile = await meRes.json(); // { user_id, username, account_type }

  return {
    providerId: String(profile.user_id ?? short.user_id),
    username: profile.username,
    accountType: profile.account_type,
    accessToken: longLived?.access_token || short.access_token,
    expiresInSeconds: longLived?.expires_in ?? 3600
  };
}

/**
 * Mock identity for development when Meta credentials/app-review are absent.
 * Clearly labeled mock everywhere it surfaces (health, UI badge, DB flags).
 */
export async function mockIdentity(state) {
  const mockUser = state.mockUser || 'mock_creator';
  return {
    providerId: `mock-${mockUser}`,
    username: mockUser,
    accountType: 'CREATOR',
    accessToken: `mock-token-${Date.now()}`,
    expiresInSeconds: 60 * 60,
    isMock: true
  };
}

/** Find-or-create the influencer User + skeleton profile for an identity. */
export async function upsertInfluencerFromIdentity(identity, req = {}) {
  let user = await User.findOne({ 'instagram.providerId': identity.providerId });
  const tokenEnc = encryptSecret(identity.accessToken);
  const tokenExpiresAt = new Date(Date.now() + identity.expiresInSeconds * 1000);

  if (!user) {
    user = await User.create({
      role: 'influencer',
      displayName: identity.username,
      instagram: {
        providerId: identity.providerId,
        username: identity.username,
        accountType: identity.accountType === 'BUSINESS' ? 'BUSINESS' : identity.accountType === 'CREATOR' ? 'CREATOR' : 'UNKNOWN',
        accessTokenEnc: tokenEnc,
        tokenExpiresAt,
        connectedAt: new Date(),
        reauthRequired: false,
        isMock: Boolean(identity.isMock)
      }
    });
    await InfluencerProfile.create({
      user: user._id,
      displayName: identity.username,
      username: identity.username,
      niche: 'unspecified',
      audience: { followersSource: 'self_reported' },
      isListed: false // not discoverable until profile completion
    });
    await AuditLog.create({
      action: identity.isMock ? 'auth.register.influencer.mock' : 'auth.register.influencer',
      actor: user._id,
      meta: { provider: 'instagram', username: identity.username, mock: Boolean(identity.isMock) },
      ip: req.ip
    });
  } else {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'instagram.accessTokenEnc': tokenEnc,
          'instagram.tokenExpiresAt': tokenExpiresAt,
          'instagram.connectedAt': new Date(),
          'instagram.reauthRequired': false
        }
      }
    );
    await AuditLog.create({
      action: identity.isMock ? 'auth.login.influencer.mock' : 'auth.login.influencer',
      actor: user._id,
      meta: { provider: 'instagram', mock: Boolean(identity.isMock) },
      ip: req.ip
    });
  }
  return user;
}

export function oauthMode() {
  return oauthMockMode ? 'mock' : 'live';
}

export { decryptSecret };
