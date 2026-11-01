import type { Db } from '../../shared/db';

// Supabase data access for scan_log. No business rules here.
export function createScanRepository(db: Db) {
  return {
    async countScansForDay(userId: string, day: string): Promise<number> {
      const { count, error } = await db
        .from('scan_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('day', day);
      if (error) throw error;
      return count ?? 0;
    },

    async recordScan(userId: string, day: string): Promise<void> {
      const { error } = await db.from('scan_log').insert({ user_id: userId, day });
      if (error) throw error;
    },
  };
}

export type ScanRepository = ReturnType<typeof createScanRepository>;
