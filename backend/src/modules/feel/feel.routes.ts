import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { FeelController } from './feel.controller';
import {
  checkinBodySchema,
  experimentBodySchema,
  experimentParamsSchema,
  questionParamsSchema,
  triedBodySchema,
} from './feel.schemas';

export function createFeelRouter(controller: FeelController): Router {
  const router = Router();
  router.get('/question/:mealId', validate('params', questionParamsSchema), controller.getQuestion);
  router.get('/pattern', controller.getWeeklyPattern);
  router.get('/due', controller.getDue);
  router.post('/checkins', validate('body', checkinBodySchema), controller.submitCheckin);
  router.post('/experiments', validate('body', experimentBodySchema), controller.createExperiment);
  router.get('/experiments/current', controller.getCurrentExperiment);
  router.post(
    '/experiments/:id/tried',
    validate('params', experimentParamsSchema),
    validate('body', triedBodySchema),
    controller.markExperimentTried,
  );
  return router;
}
