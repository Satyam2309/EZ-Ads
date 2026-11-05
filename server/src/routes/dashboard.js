import { Router } from 'express';
import { requireAuth } from '../middleware/session.js';
import { asyncHandler } from '../utils/errors.js';
import { getDashboardOverview } from '../services/dashboardService.js';

const router = Router();

/**
 * GET /dashboard/overview
 * Read-only role-aware aggregates for the dashboards (no writes, no side effects).
 */
router.get('/dashboard/overview', requireAuth, asyncHandler(async (req, res) => {
  const data = await getDashboardOverview(req.user);
  res.json({ ok: true, data });
}));

export default router;
