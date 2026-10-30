import type { Db } from '../../shared/db';

// Supabase data access for meals. No business rules here.
export function createMealsRepository(_db: Db) {
  return {};
}

export type MealsRepository = ReturnType<typeof createMealsRepository>;
