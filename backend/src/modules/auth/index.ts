import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createAuthController } from './auth.controller';
import { createAuthRepository } from './auth.repository';
import { createAuthRouter } from './auth.routes';
import { createAuthService, type AuthService } from './auth.service';

export type { AuthService };

// The only file other modules may import.
export function createAuthModule({ db }: { db: Db }): { router: Router; service: AuthService } {
  const service = createAuthService({
    repository: createAuthRepository(db),
  });
  const router = createAuthRouter(createAuthController(service));
  return { router, service };
}
