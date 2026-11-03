import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { MealsController } from './meals.controller';
import {
  historyQuerySchema,
  mealParamsSchema,
  saveMealBodySchema,
  updateMealBodySchema,
} from './meals.schemas';

export function createMealsRouter(controller: MealsController): Router {
  const router = Router();
  router.post('/', validate('body', saveMealBodySchema), controller.saveMeal);
  // Fixed paths first, so they are never read as a meal id.
  router.get('/today', controller.listToday);
  router.get('/week', controller.week);
  router.get('/history', validate('query', historyQuerySchema), controller.history);
  router.get('/:id', validate('params', mealParamsSchema), controller.getMeal);
  router.patch(
    '/:id',
    validate('params', mealParamsSchema),
    validate('body', updateMealBodySchema),
    controller.updateMeal,
  );
  router.delete('/:id', validate('params', mealParamsSchema), controller.deleteMeal);
  return router;
}
