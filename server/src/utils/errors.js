/**
 * Central API error utilities.
 * Every thrown application error goes through AppError; the central
 * handler in app.js maps these (plus Mongoose/DB errors) to a safe JSON envelope:
 *   { ok: false, error: { code, message } }
 * Internal errors never leak stack traces to clients.
 */

export class AppError extends Error {
  constructor(message, status = 500, code = 'APP_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg = 'Bad request', code = 'BAD_REQUEST') => new AppError(msg, 400, code);
export const unauthorized = (msg = 'Authentication required', code = 'UNAUTHORIZED') => new AppError(msg, 401, code);
export const forbidden = (msg = 'You do not have permission to do this', code = 'FORBIDDEN') => new AppError(msg, 403, code);
export const notFound = (msg = 'Resource not found', code = 'NOT_FOUND') => new AppError(msg, 404, code);
export const conflict = (msg = 'Resource conflict', code = 'CONFLICT') => new AppError(msg, 409, code);

/** Wraps async controllers: a rejected promise reaches the central error handler. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Maps well-known Mongoose errors to safe AppErrors with client-friendly codes. */
export function mapMongooseError(err) {
  if (err instanceof AppError) return err;

  // Controllers/validators may throw tagged plain Errors (status+code preset)
  if (err && err.code && err.status) return err;

  if (err?.name === 'ValidationError') {
    const first = Object.values(err.errors || {})[0];
    return new AppError(first?.message || 'Validation failed', 400, 'VALIDATION_ERROR');
  }
  if (err?.name === 'CastError') {
    return new AppError('Invalid identifier format', 400, 'INVALID_ID');
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new AppError(`Duplicate value for ${field}`, 409, 'DUPLICATE_KEY');
  }
  return err;
}
