import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createNutritionController } from './nutrition.controller';
import { createNutritionRepository } from './nutrition.repository';
import { createNutritionRouter } from './nutrition.routes';
import {
  createNutritionService,
  portionFromDish,
  type NutritionService,
} from './nutrition.service';

export { portionFromDish };
export type { NutritionService };
export type { Dish, PortionNutrition, Unit } from './nutrition.types';

// The only file other modules may import.
export function createNutritionModule({ db }: { db: Db }): {
  router: Router;
  service: NutritionService;
} {
  const service = createNutritionService({ repository: createNutritionRepository(db) });
  const router = createNutritionRouter(createNutritionController(service));
  return { router, service };
}
