import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { GoalsController } from './goals.controller';
import { createBodySchema, goalIdParamsSchema, updateBodySchema } from './goals.schemas';

export function createGoalsRouter(controller: GoalsController): Router {
  const router = Router();
  router.get('/mine', controller.mine);
  router.post('/', validate('body', createBodySchema), controller.create);
  router.patch('/mine', validate('body', updateBodySchema), controller.update);
  router.get('/celebrations', controller.celebrations);
  router.get('/friends', controller.friends);
  router.post('/:id/cheer', validate('params', goalIdParamsSchema), controller.cheer);
  return router;
}
