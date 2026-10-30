import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createProfilesController } from './profiles.controller';
import { createProfilesRepository } from './profiles.repository';
import { createProfilesRouter } from './profiles.routes';
import { createProfilesService, type ProfilesService } from './profiles.service';

export type { ProfilesService };

// The only file other modules may import.
export function createProfilesModule({ db }: { db: Db }): {
  router: Router;
  service: ProfilesService;
} {
  const service = createProfilesService({
    repository: createProfilesRepository(db),
  });
  const router = createProfilesRouter(createProfilesController(service));
  return { router, service };
}
