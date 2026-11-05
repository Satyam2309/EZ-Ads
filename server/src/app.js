import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { attachUser } from './middleware/session.js';
import originGuard from './middleware/originGuard.js';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { dbState } from './config/db.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import docsRouter from './routes/docs.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }));
app.use(
  cors({
    origin: [env.CLIENT_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser); // JWT httpOnly session → req.user (status must be active)
app.use(originGuard); // CSRF defense-in-depth: mismatched origin is rejected on every write
app.use(mongoSanitize()); // strips $ / . operators — NoSQL injection guard

// Minimal, safe request logging (no cookies/headers/body → no tokens or passwords)
morgan.token('safe-path', (req) => (req.originalUrl || '').split('?')[0]);
app.use(morgan(isProd ? 'combined' : ':method :safe-path :status :response-time ms'));

// Global API rate limit (stricter per-route limits are applied individually later)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
);

app.use('/api', apiRouter);
app.use('/api', docsRouter);

if (isProd) {
  // Serve the built SPA from the API process (single-service deploy).
  const dist = path.resolve(process.cwd(), '../client/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    console.log(`[api] serving SPA from ${dist}`);
  } else {
    console.warn('[api] client/dist not found — API-only deploy');
  }
}

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Central error handler — safe payloads, no stack traces to clients
app.use(errorHandler);

export default app;
export { dbState };
