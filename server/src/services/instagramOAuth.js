/**
 * Instagram OAuth service — "Instagram API with Unified Login"
 * (Facebook Login for Business with Instagram assets). Meta docs, Nov 2026:
 *  - authorize: https://www.facebook.com/v23.0/dialog/oauth
 *      client_id=META_APP_ID, redirect_uri, response_type=code, config_id=META_CONFIG_ID
 *  - short-lived token: GET https://graph.facebook.com/v23.0/oauth/access_token
 *      (client_id, client_secret, redirect_uri, code)
 *  - long-lived: GET https://graph.facebook.com/v23.0/oauth/access_token
 *      (grant_type=fb_exchange_token, client_id, client_secret, fb_exchange_token)
 *  - profile: GET https://graph.instagram.com/v23.0/me?fields=user_id,username,account_type
 * Tokens are encrypted at rest; secrets never leave the server; the frontend
 * only ever receives our own session cookie.
 */
import { env, oauthMockMode } from '../config/env.js';
import { User, InfluencerProfile, AuditLog } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { encryptSecret, decryptSecret } from '../utils/tokenCrypto.js';
import { signState, verifyState } from './oauthState.js';

// Unified Login endpoints (Facebook Login for Business)
const AUTH_URL = 'https://www.facebook.com/v23.0/dialog/oauth';
const TOKEN_URL = 'https://graph.facebook.com/v23.0/oauth/access_token';
const GRAPH_ME  = 'https://graph.instagram.com/v23.0/me';

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id:     env.META_APP_ID,
    redirect_uri:  env.META_REDIRECT_URI,
    response_type: 'code',
    config_id:     env.META_CONFIG_ID,  // required for Unified Login
    state                               // CSRF protection — Meta echoes this back to callback
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchange authorization code → short-lived → long-lived token + profile. */
export async function exchangeCodeForIdentity(code) {
  // 1. Exchange code for access token (Graph API GET)
  const tokenParams = new URLSearchParams({
    client_id:     env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    redirect_uri:  env.META_REDIRECT_URI,
    code
  });
  const res = await fetch(`${TOKEN_URL}?${tokenParams}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[oauth] token exchange error:', res.status, detail);
    throw new AppError(`Instagram token exchange failed (${res.status}): ${detail}`, 502, 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }
  const short = await res.json(); // { access_token, token_type, expires_in }

  let accessToken = short.access_token;
  let expiresIn = short.expires_in || 3600;

  // 2. Try exchanging for long-lived token if applicable
  try {
    const llParams = new URLSearchParams({
      grant_type:       'fb_exchange_token',
      client_id:        env.META_APP_ID,
      client_secret:    env.META_APP_SECRET,
      fb_exchange_token: short.access_token
    });
    const llRes = await fetch(`${TOKEN_URL}?${llParams}`);
    if (llRes.ok) {
      const longLived = await llRes.json();
      if (longLived?.access_token) {
        accessToken = longLived.access_token;
        expiresIn = longLived.expires_in ?? 5184000; // 60 days
      }
    }
  } catch (err) {
    console.warn('[oauth] long-lived token exchange skipped:', err.message);
  }

  // 3. Resiliently fetch Instagram profile across all Meta Graph API variants
  let providerId = null;
  let username = null;
  let accountType = 'CREATOR';

  // Strategy A: Unified Login / Facebook Login for Business -> /me/assigned_instagram_accounts
  try {
    const assignedRes = await fetch(
      `https://graph.facebook.com/v23.0/me/assigned_instagram_accounts?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`
    );
    if (assignedRes.ok) {
      const assignedData = await assignedRes.json();
      console.log('[oauth] assigned_instagram_accounts:', JSON.stringify(assignedData));
      if (assignedData?.data && assignedData.data.length > 0) {
        const ig = assignedData.data[0];
        providerId = String(ig.id);
        username = ig.username || ig.name;
      }
    }
  } catch (err) {
    console.warn('[oauth] assigned_instagram_accounts error:', err.message);
  }

  // Strategy B: /me/accounts -> Page -> instagram_business_account
  if (!providerId) {
    try {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,instagram_business_account{id,username,name}&access_token=${encodeURIComponent(accessToken)}`
      );
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        console.log('[oauth] me/accounts:', JSON.stringify(accountsData));
        const pageWithIg = accountsData?.data?.find((p) => p.instagram_business_account?.id);
        if (pageWithIg) {
          providerId = String(pageWithIg.instagram_business_account.id);
          username = pageWithIg.instagram_business_account.username || pageWithIg.instagram_business_account.name;
          accountType = 'BUSINESS';
        }
      }
    } catch (err) {
      console.warn('[oauth] me/accounts error:', err.message);
    }
  }

  // Strategy C: Direct Instagram Graph API /me (if token is an Instagram User Access Token)
  if (!providerId) {
    try {
      const igMeRes = await fetch(
        `https://graph.instagram.com/v23.0/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(accessToken)}`
      );
      if (igMeRes.ok) {
        const igMeData = await igMeRes.json();
        console.log('[oauth] graph.instagram.com/me:', JSON.stringify(igMeData));
        if (igMeData?.user_id || igMeData?.id) {
          providerId = String(igMeData.user_id || igMeData.id);
          username = igMeData.username;
          accountType = igMeData.account_type || 'CREATOR';
        }
      }
    } catch (err) {
      console.warn('[oauth] graph.instagram.com/me error:', err.message);
    }
  }

  // Strategy D: Facebook Graph API /me (fallback for user identity)
  if (!providerId) {
    try {
      const fbMeRes = await fetch(
        `https://graph.facebook.com/v23.0/me?fields=id,name,short_name&access_token=${encodeURIComponent(accessToken)}`
      );
      if (fbMeRes.ok) {
        const fbMeData = await fbMeRes.json();
        console.log('[oauth] graph.facebook.com/me:', JSON.stringify(fbMeData));
        if (fbMeData?.id) {
          providerId = String(fbMeData.id);
          username = fbMeData.short_name || fbMeData.name?.replace(/\s+/g, '_').toLowerCase();
        }
      }
    } catch (err) {
      console.warn('[oauth] graph.facebook.com/me error:', err.message);
    }
  }

  if (!providerId) {
    throw new AppError(
      'No Instagram account found. Make sure your Instagram is a Professional or Creator account linked in Meta Business.',
      400,
      'OAUTH_NO_IG_ACCOUNT'
    );
  }

  return {
    providerId,
    username: username || `creator_${providerId.slice(-6)}`,
    accountType,
    accessToken,
    expiresInSeconds: expiresIn
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
