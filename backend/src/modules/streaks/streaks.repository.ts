import type { Db } from '../../shared/db';

// Supabase data access for streaks. No business rules here.
export function createStreaksRepository(_db: Db) {
  return {};
}

export type StreaksRepository = ReturnType<typeof createStreaksRepository>;
