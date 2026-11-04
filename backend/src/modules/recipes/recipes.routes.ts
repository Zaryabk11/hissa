import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { RecipesController } from './recipes.controller';
import { recipeParamsSchema } from './recipes.schemas';

export function createRecipesRouter(controller: RecipesController): Router {
  const router = Router();
  const params = validate('params', recipeParamsSchema);
  router.get('/', controller.list);
  router.get('/:id', params, controller.detail);
  router.post('/:id/not-for-me', params, controller.markNotForMe);
  router.delete('/:id/not-for-me', params, controller.undoNotForMe);
  return router;
}
