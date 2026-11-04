import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { ProfilesController } from './profiles.controller';
import { profileBodySchema, usernameBodySchema } from './profiles.schemas';

export function createProfilesRouter(controller: ProfilesController): Router {
  const router = Router();
  router.get('/me', controller.getProfile);
  router.put('/me', validate('body', profileBodySchema), controller.putProfile);
  router.put('/me/username', validate('body', usernameBodySchema), controller.putUsername);
  return router;
}
