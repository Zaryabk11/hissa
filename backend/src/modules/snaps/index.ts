import type { Router } from 'express';
import type { Config } from '../../shared/config';
import type { Db } from '../../shared/db';
import type { Job } from '../../shared/jobs';
import type { FriendsService } from '../friends';
import type { MealsService } from '../meals';
import type { ProfilesService } from '../profiles';
import { createSnapStorageClient } from './snap-storage.client';
import { createSnapsController } from './snaps.controller';
import { createSnapsRepository } from './snaps.repository';
import { createSnapsRouter } from './snaps.routes';
import { createSnapsService, type SnapsService } from './snaps.service';

export type { SnapsService };

// The only file other modules may import. `jobs` is empty until the sweeper lands.
export function createSnapsModule({
  db,
  friends,
  meals,
  profiles,
}: {
  db: Db;
  config: Config;
  friends: FriendsService;
  meals: MealsService;
  profiles: ProfilesService;
}): {
  router: Router;
  service: SnapsService;
  jobs: Job[];
} {
  const service = createSnapsService({
    repository: createSnapsRepository(db),
    storage: createSnapStorageClient(db),
    friends,
    meals,
    profiles,
  });
  const router = createSnapsRouter(createSnapsController(service));
  return { router, service, jobs: [] };
}
