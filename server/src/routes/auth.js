import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { attachUser, requireAuth } from '../middleware/session.js';
import {
  parseBody, registerBrandSchema, registerCreatorSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema,
  selfProfileUpdateSchema, changePasswordSchema
} from '../validators/authSchemas.js';
import {
  registerBrandHandler, registerCreatorHandler, loginBrandHandler, loginCreatorHandler,
  loginAdminHandler, logoutHandler, meHandler,
  getAccountHandler, updateAccountHandler, changePasswordHandler,
  verifyEmailHandler, resendVerificationHandler, requestPasswordResetHandler, resetPasswordHandler, devMailboxHandler,
  instagramStartHandler, instagramCallbackHandler, instagramMockCallbackHandler
} from '../controllers/authController.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();
router.use(attachUser);

// Brute-force protection: strict on token trades, moderate on reads/writes.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts — try again in 15 minutes' } } });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many reset requests — try again later' } } });
const oauthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
// stricter still for admin logins — these credentials control the whole platform
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts — try again in 15 minutes' } } });

/* ---------- Brand ---------- */
router.post('/register/brand', loginLimiter, asyncHandler(async (req, res) => {
  req.body = parseBody(registerBrandSchema, req.body);
  await registerBrandHandler(req, res);
}));
router.post('/login/brand', loginLimiter, asyncHandler(async (req, res) => {
  req.body = parseBody(loginSchema, req.body); // string-typed email/password or clean 400
  await loginBrandHandler(req, res);
}));

/* ---------- Creator (influencer) ---------- */
router.post('/register/creator', loginLimiter, asyncHandler(async (req, res) => {
  req.body = parseBody(registerCreatorSchema, req.body);
  await registerCreatorHandler(req, res);
}));
router.post('/login/creator', loginLimiter, asyncHandler(async (req, res) => {
  req.body = parseBody(loginSchema, req.body);
  await loginCreatorHandler(req, res);
}));
router.post('/login/admin', adminLimiter, asyncHandler(async (req, res) => {
  req.body = parseBody(loginSchema, req.body);
  await loginAdminHandler(req, res);
}));
router.post('/logout', asyncHandler(logoutHandler));
router.get('/me', requireAuth, asyncHandler(meHandler));

/* ---------- Own account: settings page ---------- */
router.get('/account', requireAuth, asyncHandler(getAccountHandler));
router.patch('/account', requireAuth,
  asyncHandler(async (req, _res, next) => { req.body = parseBody(selfProfileUpdateSchema, req.body); next(); }),
  asyncHandler(updateAccountHandler));
router.post('/account/password', requireAuth,
  asyncHandler(async (req, _res, next) => { req.body = parseBody(changePasswordSchema, req.body); next(); }),
  asyncHandler(changePasswordHandler));
router.get('/verify-email', resetLimiter, asyncHandler(verifyEmailHandler));
// re-send the verification link to the signed-in account (lost / never delivered email)
router.post('/resend-verification', requireAuth, resetLimiter, asyncHandler(resendVerificationHandler));
router.post('/password-reset-request', resetLimiter,
  asyncHandler(async (req, _res, next) => { req.body = parseBody(passwordResetRequestSchema, req.body); next(); }),
  asyncHandler(requestPasswordResetHandler));
router.post('/password-reset', resetLimiter,
  asyncHandler(async (req, _res, next) => { req.body = parseBody(passwordResetSchema, req.body); next(); }),
  asyncHandler(resetPasswordHandler));
// dev-only: 404s in production (inside handler); never a secret source there
router.get('/dev/mailbox', asyncHandler(devMailboxHandler));

/* ---------- Influencer (Instagram official OAuth) ---------- */
router.get('/instagram/start', oauthLimiter, asyncHandler(instagramStartHandler));
// Meta redirects here via browser (state+code in query)
router.get('/instagram/callback', asyncHandler(instagramCallbackHandler));
// Development-only mock completion (labeled, blocked when OAUTH_MOCK_MODE=false)
router.post('/instagram/mock-callback', oauthLimiter, asyncHandler(instagramMockCallbackHandler));

export default router;
