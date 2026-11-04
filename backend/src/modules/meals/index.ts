import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { GoalsService } from '../goals';
import type { StreaksService } from '../streaks';
import type { NutritionService } from '../nutrition';
import { createMealsController } from './meals.controller';
import { createMealsRepository } from './meals.repository';
import { createMealsRouter } from './meals.routes';
import { createMealsService, type MealsService } from './meals.service';

export type { MealsService };

// The only file other modules may import.
export function createMealsModule({
  db,
  nutrition,
  streaks,
  goals,
}: {
  db: Db;
  nutrition: NutritionService;
  streaks: StreaksService;
  goals: GoalsService;
}): {
  router: Router;
  service: MealsService;
} {
  const service = createMealsService({
    repository: createMealsRepository(db),
    nutrition,
    streaks,
    goals,
  });
  const router = createMealsRouter(createMealsController(service));
  return { router, service };
}
