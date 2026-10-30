import type { Db } from '../../shared/db';

// Supabase data access for auth. No business rules here.
export function createAuthRepository(_db: Db) {
  return {};
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
