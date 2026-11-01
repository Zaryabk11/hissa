import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../errors';
import { logger } from '../logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new NotFoundError());

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // body-parser errors (oversized or malformed body) carry a 4xx status and expose = true.
  const { status, expose } = err as { status?: unknown; expose?: unknown };
  if (typeof status === 'number' && status >= 400 && status < 500 && expose === true) {
    // Stable messages: the parser's own text can echo request details.
    const error =
      status === 413
        ? { code: 'payload_too_large', message: 'Request body too large' }
        : { code: 'bad_request', message: 'Bad request' };
    res.status(status).json({ error });
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
};
