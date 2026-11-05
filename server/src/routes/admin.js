import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/session.js';
import { asyncHandler } from '../utils/errors.js';
import { parseBody, userStatusSchema, reportUpdateSchema } from '../validators/adminSchemas.js';
import {
  getPlatformStats, listUsers, setUserStatus, getUserDetail,
  listReports, updateReport, listAllTransactions, listAuditLogs
} from '../services/adminService.js';

const router = Router();

// every admin endpoint is admin-CLI-provisioned and double-gated here
router.use(requireAuth, requireRole('admin'));

router.get('/stats', asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await getPlatformStats() });
}));

/* ---------------- Users / suspensions ---------------- */

router.get('/users', asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await listUsers(req.query) });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await getUserDetail(req.user._id, req.params.id) });
}));

router.patch('/users/:id/status', asyncHandler(async (req, res, next) => {
  req.body = parseBody(userStatusSchema, req.body);
  next();
}), asyncHandler(async (req, res) => {
  const user = await setUserStatus(req.user._id, req.params.id, req.body.status, req);
  res.json({ ok: true, data: user.toJSON() });
}));

/* ---------------- Reports / disputes ---------------- */

router.get('/reports', asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await listReports(req.query) });
}));

router.patch('/reports/:id', asyncHandler(async (req, res, next) => {
  req.body = parseBody(reportUpdateSchema, req.body);
  next();
}), asyncHandler(async (req, res) => {
  const report = await updateReport(req.user._id, req.params.id, req.body, req);
  res.json({ ok: true, data: report.toJSON() });
}));

/* ---------------- Simulated ledger ---------------- */

router.get('/transactions', asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await listAllTransactions(req.query) });
}));

/* ---------------- Audit log (read-only) ---------------- */

router.get('/audit-logs', asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await listAuditLogs(req.query) });
}));

export default router;
