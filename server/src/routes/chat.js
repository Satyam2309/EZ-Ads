import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/session.js';
import { asyncHandler, badRequest } from '../utils/errors.js';
import { listNotifications, markRead } from '../services/notificationService.js';
import { unreadMessageCount } from '../services/chatService.js';
import { listTransactions } from '../services/paymentService.js';
import * as chat from '../services/chatService.js';
import { conversationCreateSchema, messageBodySchema, parseBody } from '../validators/chatSchemas.js';

const router = Router();
router.use(requireAuth);

/* ---------------- Conversations & messages ---------------- */

router.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
  const items = await chat.listConversations(req.user._id);
  const unread = await unreadMessageCount(req.user._id);
  res.json({ ok: true, data: { items, unread } });
}));

router.post('/conversations', requireRole('brand', 'influencer'), asyncHandler(async (req, res, next) => {
  req.body = parseBody(conversationCreateSchema, req.body);
  next();
}), asyncHandler(async (req, res) => {
  const conv = await chat.ensureConversation(req.user._id, req.body.campaignId, req.body.influencerId);
  res.status(201).json({ ok: true, data: conv });
}));

router.get('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const { before, limit } = req.query;
  const items = await chat.listMessages(req.user._id, req.params.id, { before, limit });
  res.json({ ok: true, data: items });
}));

router.post('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res, next) => {
  // REST parity with the socket event: same validation, same persistence
  req.body = { body: (parseBody(messageBodySchema, req.body)).body };
  next();
}), asyncHandler(async (req, res) => {
  const msg = await chat.sendMessage(req.user._id, req.params.id, req.body.body);
  res.status(201).json({ ok: true, data: msg });
}));

router.post('/conversations/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const data = await chat.markConversationRead(req.user._id, req.params.id);
  res.json({ ok: true, data });
}));

/* ---------------- Notifications ---------------- */

router.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const data = await listNotifications(req.user._id, req.query);
  res.json({ ok: true, data });
}));

router.post('/notifications/read', requireAuth, asyncHandler(async (req, res, next) => {
  // body may be {} (all) or { ids: [...] }
  if (req.body?.ids !== undefined && !Array.isArray(req.body.ids)) {
    return next(badRequest('ids must be an array'));
  }
  next();
}), asyncHandler(async (req, res) => {
  const data = await markRead(req.user._id, req.body?.ids || null);
  res.json({ ok: true, data });
}));

/* ---------------- Payments (SIMULATED ledger) ---------------- */

router.get('/payments', requireAuth, asyncHandler(async (req, res) => {
  const data = await listTransactions(
    { role: req.user.role, id: String(req.user._id) },
    req.query
  );
  res.json({ ok: true, data });
}));

export default router;
