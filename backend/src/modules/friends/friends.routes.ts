import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { FriendsController } from './friends.controller';
import { requestBodySchema, searchQuerySchema, userIdParamsSchema } from './friends.schemas';

// `cheerStreakEnabled` (SNAPS_ENABLED): when off the cheer route is not registered, so it is a 404.
export function createFriendsRouter(
  controller: FriendsController,
  { cheerStreakEnabled }: { cheerStreakEnabled: boolean },
): Router {
  const router = Router();
  const uuid = validate('params', userIdParamsSchema);
  router.get('/overview', controller.overview);
  router.get('/search', validate('query', searchQuerySchema), controller.search);
  router.post('/requests', validate('body', requestBodySchema), controller.request);
  router.post('/requests/:userId/accept', uuid, controller.accept);
  router.post('/requests/:userId/decline', uuid, controller.decline);
  router.delete('/:userId', uuid, controller.remove);
  router.post('/:userId/nudge', uuid, controller.nudge);
  if (cheerStreakEnabled) router.post('/:userId/cheer-streak', uuid, controller.cheerStreak);
  return router;
}
