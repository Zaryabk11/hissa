import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { ProfilesController } from './profiles.controller';
import { profileBodySchema } from './profiles.schemas';

export function createProfilesRouter(controller: ProfilesController): Router {
  const router = Router();
  router.get('/me', controller.getProfile);
  router.put('/me', validate('body', profileBodySchema), controller.putProfile);
  return router;
}
