import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { FeelController } from './feel.controller';
import { checkinBodySchema, questionParamsSchema } from './feel.schemas';

export function createFeelRouter(controller: FeelController): Router {
  const router = Router();
  router.get('/question/:mealId', validate('params', questionParamsSchema), controller.getQuestion);
  router.get('/pattern', controller.getWeeklyPattern);
  router.get('/due', controller.getDue);
  router.post('/checkins', validate('body', checkinBodySchema), controller.submitCheckin);
  return router;
}
