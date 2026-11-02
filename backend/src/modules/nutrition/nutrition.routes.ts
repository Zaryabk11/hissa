import { Router } from 'express';
import type { NutritionController } from './nutrition.controller';

export function createNutritionRouter(controller: NutritionController): Router {
  const router = Router();
  router.get('/catalog', controller.getCatalog);
  return router;
}
