import type { Db } from '../../shared/db';

// Supabase data access for plan. No business rules here.
export function createPlanRepository(_db: Db) {
  return {};
}

export type PlanRepository = ReturnType<typeof createPlanRepository>;
