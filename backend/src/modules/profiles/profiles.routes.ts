import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { ProfilesController } from './profiles.controller';
import { avoidsBodySchema, profileBodySchema, usernameBodySchema } from './profiles.schemas';

export function createProfilesRouter(controller: ProfilesController): Router {
  const router = Router();
  router.get('/me', controller.getProfile);
  router.put('/me', validate('body', profileBodySchema), controller.putProfile);
  router.put('/me/username', validate('body', usernameBodySchema), controller.putUsername);
  router.get('/me/avoids', controller.getAvoids);
  router.put('/me/avoids', validate('body', avoidsBodySchema), controller.putAvoids);
  return router;
}
