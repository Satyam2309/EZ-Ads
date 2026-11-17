import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { attachUser, requireAuth } from '../middleware/session.js';
import { asyncHandler } from '../utils/errors.js';
import { fetchAndStoreInsights, getInsights } from '../services/instagramInsights.js';

const router = Router();
router.use(attachUser);

// 5 syncs per 5 minutes per creator
const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many sync requests — wait a few minutes' } }
});

// GET /api/instagram/insights — return cached insights for the logged-in creator
router.get('/insights', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'influencer') {
    return res.status(403).json({ ok: false, error: { message: 'Not a creator account' } });
  }
  const data = await getInsights(req.user._id);
  res.json({ ok: true, data });
}));

// POST /api/instagram/sync — force-fetch fresh data from Meta Graph API
router.post('/sync', requireAuth, syncLimiter, asyncHandler(async (req, res) => {
  if (req.user.role !== 'influencer') {
    return res.status(403).json({ ok: false, error: { message: 'Not a creator account' } });
  }
  await fetchAndStoreInsights(req.user._id);
  const data = await getInsights(req.user._id);
  res.json({ ok: true, data });
}));

export default router;
