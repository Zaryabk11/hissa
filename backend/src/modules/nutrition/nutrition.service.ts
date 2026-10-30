import { NotImplementedError } from '../../shared/errors';
import type { FatSecretClient } from './fatsecret.client';
import type { NutritionRepository } from './nutrition.repository';

interface NutritionDeps {
  repository: NutritionRepository;
  fatsecret: FatSecretClient;
}

// Business rules for nutrition.
export function createNutritionService(_deps: NutritionDeps) {
  return {
    async getServingNutrition(): Promise<never> {
      throw new NotImplementedError('nutrition.getServingNutrition');
    },
  };
}

export type NutritionService = ReturnType<typeof createNutritionService>;
