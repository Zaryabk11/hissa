import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../errors';
import { logger } from '../logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new NotFoundError());

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
};
