import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { StreaksController } from './streaks.controller';
import { inviteParamsSchema } from './streaks.schemas';
export function createStreaksRouter(controller: StreaksController): Router {
  const router = Router();
  router.get('/', controller.getStreak);
  router.post('/invites', controller.createInvite);
  router.get('/invites/:code', validate('params', inviteParamsSchema), controller.previewInvite);
  router.post(
    '/invites/:code/accept',
    validate('params', inviteParamsSchema),
    controller.acceptInvite,
  );
  router.post(
    '/invites/:code/decline',
    validate('params', inviteParamsSchema),
    controller.declineInvite,
  );
  router.post('/end', controller.endPair);
  return router;
}
