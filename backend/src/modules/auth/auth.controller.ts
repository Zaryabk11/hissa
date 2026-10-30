import type { Request, Response } from 'express';
import type { AuthService } from './auth.service';

// Maps HTTP to auth service calls. No business logic.
export function createAuthController(service: AuthService) {
  return {
    async getCurrentUser(_req: Request, res: Response): Promise<void> {
      res.json(await service.getCurrentUser());
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
