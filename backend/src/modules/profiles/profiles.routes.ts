import { Router } from 'express';
import type { ProfilesController } from './profiles.controller';

export function createProfilesRouter(controller: ProfilesController): Router {
  const router = Router();
  router.get('/', controller.getProfile);
  return router;
}
