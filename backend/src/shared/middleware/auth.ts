import type { NextFunction, Request, Response } from 'express';
import { ServiceUnavailableError, UnauthorizedError } from '../errors';
import type { Db } from '../db';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

// Verifies the Supabase access token sent by the app and exposes the user id as req.userId.
export function createRequireAuth(db: Db) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedError();
    const { data, error } = await db.auth.getUser(token);
    // auth-js: a rejected token is an AuthApiError carrying the 4xx HTTP status; network failures
    // and 5xx come back as AuthRetryableFetchError (status 0 or 5xx), so they are not a bad token.
    // 429 is rate limiting, not a bad token: report unavailable so the app backs off, not signs out.
    const rejected =
      typeof error?.status === 'number' &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429;
    if (error && !rejected) throw new ServiceUnavailableError('Authentication service unavailable');
    if (error || !data.user) throw new UnauthorizedError();
    req.userId = data.user.id;
    next();
  };
}
