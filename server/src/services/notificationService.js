/**
 * Notification service — Phase 6.
 * One small API: notify(...) persists + emits a realtime push if Socket.IO is
 * attached. Services call this at workflow events; the SPA polls REST and (in
 * dev) also receives instant pushes over the socket.
 */
import { Notification } from '../models/index.js';
import { NOTIFICATION_TYPES } from '../models/Notification.js';

/** The Socket.IO server instance is registered here at server start. */
let ioRef = null;

export function attachNotificationSocket(io) {
  ioRef = io;
}

/** Fire-and-forget from services; never rethrows to callers. */
export async function notify(userId, type, refs = {}, title, body = '') {
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  const n = await Notification.create({
    user: userId,
    type,
    refs: {
      campaign: refs.campaign || undefined,
      application: refs.application || undefined,
      invitation: refs.invitation || undefined,
      conversation: refs.conversation || undefined,
      actor: refs.actor || undefined
    },
    title: String(title || '').slice(0, 120),
    body: String(body || '').slice(0, 500)
  });

  if (ioRef) {
    try {
      ioRef.to(`user:${String(userId)}`).emit('notification:new', {
        id: n._id, type: n.type, title: n.title, body: n.body, createdAt: n.createdAt,
        refs: { campaign: refs.campaign, conversation: refs.conversation }
      });
    } catch { /* realtime is best-effort */ }
  }
  return n;
}

export async function listNotifications(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
  const q = { user: userId };
  if (unreadOnly) q.readAt = null;
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [items, total, unread] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(q),
    Notification.countDocuments({ user: userId, readAt: null })
  ]);
  return { items, total, unread, page, pages: Math.ceil(total / limit) || 1 };
}

/** Marks all (or given ids) of the user's notifications read. */
export async function markRead(userId, ids = null) {
  const q = { user: userId, readAt: null };
  if (ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { updated: 0 };
    q._id = { $in: ids };
  }
  const res = await Notification.updateMany(q, { $set: { readAt: new Date() } });
  return { updated: res.modifiedCount || 0 };
}
