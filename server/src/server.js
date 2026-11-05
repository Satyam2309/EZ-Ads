import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { env, isProd } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { registerChatSockets } from './sockets/chat.js';

const server = http.createServer(app);

// Socket.IO server is created now; handshake auth + room authorization are enforced
// in sockets/ in Phase 6. Until then only the client origin can connect.
const io = new SocketIOServer(server, {
  cors: { origin: [env.CLIENT_ORIGIN], credentials: true },
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
});
app.set('io', io);

// Phase 6: authenticated Socket.IO — handshake verifies the session cookie,
// conversation rooms are authorized server-side on every join/send.
registerChatSockets(io);

async function start() {
  await connectDB(); // non-fatal: app stays up; /api/health reports db state
  server.listen(env.PORT, () => {
    console.log(`[api] EZ Ads API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[api] frontend origin: ${env.CLIENT_ORIGIN}`);
  });
}

async function shutdown(signal) {
  console.log(`[api] ${signal} received — shutting down`);
  server.close();
  try {
    io.close();
    await disconnectDB();
  } catch (err) {
    console.error('[api] shutdown error:', err.message);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error('[api] fatal start error:', err);
  process.exit(1);
});

if (!isProd) {
  console.log('[api] dev mode: node --watch is active, OAuth mock mode available');
}
