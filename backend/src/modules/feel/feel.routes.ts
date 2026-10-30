import { Router } from 'express';
import type { FeelController } from './feel.controller';

export function createFeelRouter(controller: FeelController): Router {
  const router = Router();
  router.get('/', controller.submitCheckin);
  return router;
}
