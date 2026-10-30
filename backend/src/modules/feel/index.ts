import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createFeelController } from './feel.controller';
import { createFeelRepository } from './feel.repository';
import { createFeelRouter } from './feel.routes';
import { createFeelService, type FeelService } from './feel.service';

export type { FeelService };

// The only file other modules may import.
export function createFeelModule({ db }: { db: Db }): { router: Router; service: FeelService } {
  const service = createFeelService({
    repository: createFeelRepository(db),
  });
  const router = createFeelRouter(createFeelController(service));
  return { router, service };
}
