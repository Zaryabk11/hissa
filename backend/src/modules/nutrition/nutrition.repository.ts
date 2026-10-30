import type { Db } from '../../shared/db';

// Supabase data access for nutrition. No business rules here.
export function createNutritionRepository(_db: Db) {
  return {};
}

export type NutritionRepository = ReturnType<typeof createNutritionRepository>;
