import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { MealsController } from './meals.controller';
import { saveMealBodySchema } from './meals.schemas';

export function createMealsRouter(controller: MealsController): Router {
  const router = Router();
  router.post('/', validate('body', saveMealBodySchema), controller.saveMeal);
  router.get('/today', controller.listToday);
  return router;
}
