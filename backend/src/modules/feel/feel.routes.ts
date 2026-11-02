import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { FeelController } from './feel.controller';
import { checkinBodySchema } from './feel.schemas';

export function createFeelRouter(controller: FeelController): Router {
  const router = Router();
  router.get('/due', controller.getDue);
  router.post('/checkins', validate('body', checkinBodySchema), controller.submitCheckin);
  return router;
}
