import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { MealsService } from '../meals';
import type { NutritionService } from '../nutrition';
import type { ProfilesService } from '../profiles';
import { createPlanController } from './plan.controller';
import { createPlanRouter } from './plan.routes';
import { createPlanService, type PlanService } from './plan.service';

export type { PlanService };

// The only file other modules may import. The plan module owns no data, so `db` is accepted for
// module-shape consistency only and plan.repository stays an empty placeholder.
export function createPlanModule({
  profiles,
  meals,
  nutrition,
}: {
  db: Db;
  profiles: ProfilesService;
  meals: MealsService;
  nutrition: NutritionService;
}): { router: Router; service: PlanService } {
  const service = createPlanService({ profiles, meals, nutrition });
  const router = createPlanRouter(createPlanController(service));
  return { router, service };
}
