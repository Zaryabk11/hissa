import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { PlanController } from './plan.controller';
import { planBodySchema } from './plan.schemas';

export function createPlanRouter(controller: PlanController): Router {
  const router = Router();
  router.post('/', validate('body', planBodySchema), controller.buildPlan);
  return router;
}
