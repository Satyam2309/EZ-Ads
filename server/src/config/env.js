import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ezads'),
  JWT_SECRET: z.string().min(8).default('dev_only_secret_change_me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OAUTH_STATE_SECRET: z.string().min(8).default('dev_only_oauth_state_secret'),
  TOKEN_ENC_KEY: z.string().min(8).default('dev_only_token_encryption_key'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  META_REDIRECT_URI: z.string().default('http://localhost:5000/api/auth/instagram/callback'),
  META_SCOPES: z.string().default('instagram_business_basic'),
  OAUTH_MOCK_MODE: z.enum(['true', 'false']).default('true'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  EMAIL_HOST: z.string().optional().default(''),
  EMAIL_PORT: z.coerce.number().optional().default(587),
  EMAIL_USER: z.string().optional().default(''),
  EMAIL_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('EZ Ads <no-reply@ezads.example>')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const oauthMockMode = env.OAUTH_MOCK_MODE === 'true' || !env.META_APP_ID || !env.META_APP_SECRET;

/**
 * Production fail-fast: the schema's dev-only fallbacks keep local dev zero-
 * config, but a prod boot on those defaults makes sessions forgeable (the
 * signing/encryption keys are public in the repo). Refuse to start instead.
 * Generate fresh values with `npm run gen:secrets` and set them in the deploy
 * host's environment before starting in production.
 */
if (isProd) {
  const devDefaults = [
    'dev_only_secret_change_me',
    'dev_only_oauth_state_secret',
    'dev_only_token_encryption_key'
  ];
  const stillDefault = [
    env.JWT_SECRET, env.OAUTH_STATE_SECRET, env.TOKEN_ENC_KEY
  ]
    .map((v, i) => (devDefaults.includes(v) ? ['JWT_SECRET', 'OAUTH_STATE_SECRET', 'TOKEN_ENC_KEY'][i] : null))
    .filter(Boolean);
  if (stillDefault.length > 0) {
    console.error(
      `[env] FATAL: refusing to start in production — default dev secrets in use: ${stillDefault.join(', ')}.\n` +
      'Generate replacements with `npm run gen:secrets` and set them as real environment variables.'
    );
    process.exit(1);
  }
}
