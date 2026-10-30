import type { Router } from 'express';
import type { Config } from '../../shared/config';
import type { Db } from '../../shared/db';
import { createNutritionController } from './nutrition.controller';
import { createFatSecretClient } from './fatsecret.client';
import { createNutritionRepository } from './nutrition.repository';
import { createNutritionRouter } from './nutrition.routes';
import { createNutritionService, type NutritionService } from './nutrition.service';

export type { NutritionService };

// The only file other modules may import.
export function createNutritionModule({ db, config }: { db: Db; config: Config }): {
  router: Router;
  service: NutritionService;
} {
  const service = createNutritionService({
    repository: createNutritionRepository(db),
    fatsecret: createFatSecretClient(config.FATSECRET_CLIENT_ID, config.FATSECRET_CLIENT_SECRET),
  });
  const router = createNutritionRouter(createNutritionController(service));
  return { router, service };
}
