import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createStreaksController } from './streaks.controller';
import { createStreaksRepository } from './streaks.repository';
import { createStreaksRouter } from './streaks.routes';
import { createStreaksService, type StreaksService } from './streaks.service';

export type { StreaksService };

// The only file other modules may import.
export function createStreaksModule({ db }: { db: Db }): {
  router: Router;
  service: StreaksService;
} {
  const service = createStreaksService({
    repository: createStreaksRepository(db),
  });
  const router = createStreaksRouter(createStreaksController(service));
  return { router, service };
}
