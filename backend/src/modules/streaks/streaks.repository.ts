import type { Db } from '../../shared/db';

const WINDOW_DAYS = 400;
const PAGE = 1000;
function minusDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
}

export function createStreaksRepository(db: Db) {
  return {
    async markDay(userId: string, day: string): Promise<void> {
      const { error } = await db
        .from('streak_days')
        .upsert({ user_id: userId, day }, { onConflict: 'user_id,day' });
      if (error) throw error;
    },
    // One query for all users, limited to the last 400 days (a streak longer than that reads as 400).
    async daysFor(userIds: string[], toDay: string): Promise<Record<string, string[]>> {
      const out: Record<string, string[]> = {};
      // PostgREST caps a response at 1000 rows: page with a stable order until a short page.
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db
          .from('streak_days')
          .select('user_id, day')
          .in('user_id', userIds)
          .gte('day', minusDays(toDay, WINDOW_DAYS))
          .lte('day', toDay)
          .order('user_id')
          .order('day')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        for (const row of data ?? []) (out[row.user_id as string] ??= []).push(row.day as string);
        if ((data?.length ?? 0) < PAGE) break;
      }
      return out;
    },
    async loggedDays(userId: string, fromDay: string, toDay: string): Promise<string[]> {
      const { data, error } = await db
        .from('streak_days')
        .select('day')
        .eq('user_id', userId)
        .gte('day', fromDay)
        .lte('day', toDay)
        .order('day');
      if (error) throw error;
      return (data ?? []).map((r) => r.day as string);
    },
  };
}
export type StreaksRepository = ReturnType<typeof createStreaksRepository>;
