import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors';
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
    if (error || !data.user) throw new UnauthorizedError();
    req.userId = data.user.id;
    next();
  };
}
