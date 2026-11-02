import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createAuthController } from './auth.controller';
import { createAuthRouter } from './auth.routes';
import { createAuthService, type AuthService } from './auth.service';

export type { AuthService };

// The only file other modules may import.
export function createAuthModule(_deps: { db: Db }): { router: Router; service: AuthService } {
  const service = createAuthService();
  const router = createAuthRouter(createAuthController(service));
  return { router, service };
}
