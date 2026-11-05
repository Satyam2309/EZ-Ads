/**
 * Central error handler middleware.
 * - AppError → its status/code safely to the client
 * - Mongoose errors → mapped to safe AppErrors
 * - Anything else → 500 with generic payload, full log server-side
 */
import { AppError, mapMongooseError } from '../utils/errors.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const mapped = mapMongooseError(err);
  const status = mapped.status || 500;
  const isAppError = mapped instanceof AppError || Boolean(err?.code && err?.status);

  if (status >= 500) {
    console.error(`[error] ${req.method} ${(req.originalUrl || '').split('?')[0]} →`, mapped);
  }

  res.status(status).json({
    ok: false,
    error: {
      code: isAppError ? mapped.code : 'INTERNAL_ERROR',
      message: isAppError || status < 500 ? mapped.message : 'Internal server error'
    }
  });
}
