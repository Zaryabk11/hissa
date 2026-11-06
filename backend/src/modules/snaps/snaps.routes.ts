import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { SnapsController } from './snaps.controller';
import { sendBodySchema, snapIdParamsSchema } from './snaps.schemas';

export function createSnapsRouter(controller: SnapsController): Router {
  const router = Router();
  router.post('/', validate('body', sendBodySchema), controller.send);
  router.get('/inbox', controller.inbox);
  router.post('/:id/open', validate('params', snapIdParamsSchema), controller.open);
  router.delete('/:id', validate('params', snapIdParamsSchema), controller.unsend);
  return router;
}
