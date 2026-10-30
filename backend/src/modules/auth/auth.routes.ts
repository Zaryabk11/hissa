import { Router } from 'express';
import type { AuthController } from './auth.controller';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.get('/', controller.getCurrentUser);
  return router;
}
