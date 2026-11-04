import { Router } from 'express';
import type { StreaksController } from './streaks.controller';
export function createStreaksRouter(controller: StreaksController): Router {
  const router = Router();
  router.get('/', controller.getOwn);
  return router;
}
