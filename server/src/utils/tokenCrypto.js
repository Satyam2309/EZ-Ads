import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

let cachedKey = null;
function getKey() {
  if (!cachedKey) cachedKey = createHash('sha256').update(env.TOKEN_ENC_KEY).digest();
  return cachedKey;
}

/**
 * AES-256-GCM encryption for OAuth access tokens at rest.
 * Output: base64url(iv).base64(tag).base64(ciphertext)
 * Tampered ciphertexts throw AppError — callers treat as "reauth required".
 */
export function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(payload) {
  try {
    const [ivB, tagB, dataB] = payload.split('.');
    const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('Stored credential failed integrity check — reauthorization required', 401, 'TOKEN_DECRYPT_FAILED');
  }
}
