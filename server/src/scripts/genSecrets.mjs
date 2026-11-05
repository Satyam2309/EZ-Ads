/**
 * Generates cryptographically random production secrets and prints them as
 * ready-to-paste environment lines.
 *
 *   npm run gen:secrets
 *
 * Notes:
 * - Values are printed ONCE to stdout; capture them into your password manager
 *   and the deploy host's environment (e.g. Render dashboard). We deliberately
 *   do NOT write to server/.env from this script — secrets are never written
 *   to disk by tooling you didn't fully audit.
 * - Never commit these anywhere (.gitignore already excludes .env files).
 * - Restart the server after rotating: old session cookies/OAuth states/
 *   encrypted email tokens become invalid when the underlying secret changes
 *   (logged-in users must simply log in again — an acceptable rotation cost).
 */
import { randomBytes } from 'node:crypto';

function line(name, bytes = 32) {
  console.log(`${name}=${randomBytes(bytes).toString('hex')}`);
}

console.log('# --- EZ Ads production secrets (paste into your deploy host environment) ---');
line('JWT_SECRET');            // session token signing
line('OAUTH_STATE_SECRET');    // OAuth state HMAC signing
line('TOKEN_ENC_KEY');         // email-token encryption at rest
console.log('# ---------------------------------------------------------------');
