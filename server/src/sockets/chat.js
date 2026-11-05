/**
 * Socket.IO wiring — Phase 6 realtime layer.
 *
 * Security model:
 *   - Handshake: the session cookie is read from the handshake headers and
 *     verified the same way HTTP middleware does; unauthenticated connections
 *     are rejected before any listener runs.
 *   - Rooms: no user-controlled room names. Rooms are `conversation:<id>` and
 *     `user:<id>`; joining a conversation room requires server-side
 *     participant verification on EVERY join and every send.
 */
import { SESSION_COOKIE } from '../middleware/session.js';
import { verifySessionToken } from '../utils/tokens.js';
import { User } from '../models/index.js';
import { canAccessConversation, otherParticipantId } from '../services/chatService.js';
import * as chat from '../services/chatService.js';
import { attachNotificationSocket } from '../services/notificationService.js';

function parseCookieHeader(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function registerChatSockets(io) {
  attachNotificationSocket(io);

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers.cookie || '');
      const token = cookies[SESSION_COOKIE];
      if (!token) return next(new Error('unauthorized'));
      const decoded = verifySessionToken(token);
      if (!decoded) return next(new Error('unauthorized'));
      const user = await User.findById(decoded.sub);
      if (!user || user.status !== 'active') return next(new Error('unauthorized'));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    // personal channel — notifications addressed to this user only
    socket.join(`user:${userId}`);

    socket.on('conversation:join', async ({ conversationId } = {}, ack = () => {}) => {
      try {
        if (!conversationId) throw new Error('conversationId required');
        const conv = await canAccessConversation(userId, conversationId);
        if (!conv) throw new Error('conversation not found');
        socket.join(`conversation:${conversationId}`);
        ack({ ok: true });
      } catch (e) {
        ack({ ok: false, error: e.message });
      }
    });

    socket.on('conversation:message', async ({ conversationId, body } = {}, ack = () => {}) => {
      try {
        if (!conversationId) throw new Error('conversationId required');
        // NOTE: participant re-verified inside sendMessage as well; the extra
        // room-membership check keeps sockets from another party's room from
        // ever seeing events.
        const conv = await canAccessConversation(userId, conversationId);
        if (!conv) throw new Error('conversation not found');
        const msg = await chat.sendMessage(userId, conversationId, body);
        const payload = {
          id: msg._id,
          conversation: String(conversationId),
          sender: { id: userId, displayName: (await User.findById(userId).select('displayName')).displayName },
          body: msg.body,
          createdAt: msg.createdAt
        };
        io.to(`conversation:${conversationId}`).emit('message:new', payload);
        ack({ ok: true, id: String(msg._id) });
      } catch (e) {
        ack({ ok: false, error: e.message });
      }
    });

    socket.on('conversation:read', async ({ conversationId } = {}, ack = () => {}) => {
      try {
        const res = await chat.markConversationRead(userId, conversationId);
        ack({ ok: true, updated: res.updated });
      } catch (e) {
        ack({ ok: false, error: e.message });
      }
    });

    socket.on('conversation:leave', ({ conversationId } = {}) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    // expose helper for tests/diagnostics
    socket.data.otherParticipant = async (conversation) => otherParticipantId(conversation, userId);
  });
}

export default registerChatSockets;
