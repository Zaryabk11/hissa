import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { MealsService } from '../meals';
import type { NutritionService } from '../nutrition';
import type { ProfilesService } from '../profiles';
import { createRecipesController } from './recipes.controller';
import { createRecipesRepository } from './recipes.repository';
import { createRecipesRouter } from './recipes.routes';
import type { PatternSource } from './recipes.types';
import { createRecipesService, type RecipesService } from './recipes.service';

export type { RecipesService };

// The only file other modules may import.
export function createRecipesModule({
  db,
  profiles,
  meals,
  feel,
  nutrition,
}: {
  db: Db;
  profiles: ProfilesService;
  meals: MealsService;
  feel: PatternSource;
  nutrition: NutritionService;
}): { router: Router; service: RecipesService } {
  const service = createRecipesService({
    repository: createRecipesRepository(db),
    profiles,
    meals,
    feel,
    nutrition,
  });
  const router = createRecipesRouter(createRecipesController(service));
  return { router, service };
}
