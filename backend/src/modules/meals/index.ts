import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { NutritionService } from '../nutrition';
import { createMealsController } from './meals.controller';
import { createMealsRepository } from './meals.repository';
import { createMealsRouter } from './meals.routes';
import { createMealsService, type MealsService } from './meals.service';

export type { MealsService };

// The only file other modules may import.
export function createMealsModule({ db, nutrition }: { db: Db; nutrition: NutritionService }): {
  router: Router;
  service: MealsService;
} {
  const service = createMealsService({ repository: createMealsRepository(db), nutrition });
  const router = createMealsRouter(createMealsController(service));
  return { router, service };
}
