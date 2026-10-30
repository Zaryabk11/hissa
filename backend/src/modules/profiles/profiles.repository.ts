import type { Db } from '../../shared/db';

// Supabase data access for profiles. No business rules here.
export function createProfilesRepository(_db: Db) {
  return {};
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>;
