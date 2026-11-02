import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { AuthService } from './auth.service';

// Maps HTTP to auth service calls. No business logic.
export function createAuthController(service: AuthService) {
  return {
    async getCurrentUser(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.getCurrentUser(req.userId));
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
