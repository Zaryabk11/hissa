import type { Db } from '../../shared/db';

// Supabase data access for scan. No business rules here.
export function createScanRepository(_db: Db) {
  return {};
}

export type ScanRepository = ReturnType<typeof createScanRepository>;
