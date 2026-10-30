import { NotImplementedError } from '../../shared/errors';
import type { MealsRepository } from './meals.repository';

interface MealsDeps {
  repository: MealsRepository;
}

// Business rules for meals.
export function createMealsService(_deps: MealsDeps) {
  return {
    async saveMeal(): Promise<never> {
      throw new NotImplementedError('meals.saveMeal');
    },
  };
}

export type MealsService = ReturnType<typeof createMealsService>;
