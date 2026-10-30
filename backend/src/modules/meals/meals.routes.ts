import { Router } from 'express';
import type { MealsController } from './meals.controller';

export function createMealsRouter(controller: MealsController): Router {
  const router = Router();
  router.get('/', controller.saveMeal);
  return router;
}
