import type { Router } from 'express';
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
import { createSnapsJob } from './snaps.sweeper';

export type { SnapsService };

// The only file other modules may import. The sweep job is always returned; the registry gates
// only the router on SNAPS_ENABLED.
export function createSnapsModule({
  db,
  friends,
  meals,
  profiles,
}: {
  db: Db;
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
  return { router, service, jobs: [createSnapsJob(service)] };
}
