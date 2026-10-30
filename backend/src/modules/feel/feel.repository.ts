import type { Db } from '../../shared/db';

// Supabase data access for feel. No business rules here.
export function createFeelRepository(_db: Db) {
  return {};
}

export type FeelRepository = ReturnType<typeof createFeelRepository>;
