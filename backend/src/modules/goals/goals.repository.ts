import type { Db } from '../../shared/db';
import type { GoalRow } from './goals.types';

const COLS = 'id, user_id, type, target, window_days, start_day, status, shared, reached_at';

export function createGoalsRepository(db: Db) {
  return {
    async findActive(userId: string): Promise<GoalRow | null> {
      const { data, error } = await db
        .from('goals')
        .select(COLS)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data as GoalRow | null;
    },
    async findReachedBetween(
      userId: string,
      startIso: string,
      endIso: string,
    ): Promise<GoalRow | null> {
      const { data, error } = await db
        .from('goals')
        .select(COLS)
        .eq('user_id', userId)
        .eq('status', 'reached')
        .gte('reached_at', startIso)
        .lt('reached_at', endIso)
        .order('reached_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] as GoalRow | undefined) ?? null;
    },
    async findById(id: string): Promise<GoalRow | null> {
      const { data, error } = await db.from('goals').select(COLS).eq('id', id).maybeSingle();
      if (error) throw error;
      return data as GoalRow | null;
    },
    // Throws with code 23505 when the user already has an active goal.
    async insert(
      userId: string,
      g: {
        type: string;
        target: number;
        windowDays: number | null;
        startDay: string;
        shared: boolean;
      },
    ): Promise<GoalRow> {
      const { data, error } = await db
        .from('goals')
        .insert({
          user_id: userId,
          type: g.type,
          target: g.target,
          window_days: g.windowDays,
          start_day: g.startDay,
          status: 'active',
          shared: g.shared,
        })
        .select(COLS)
        .single();
      if (error) throw error;
      return data as GoalRow;
    },
    // Conditional update: true only for the one caller that flips active -> reached.
    async markReached(id: string, reachedAtIso: string): Promise<boolean> {
      const { data, error } = await db
        .from('goals')
        .update({ status: 'reached', reached_at: reachedAtIso })
        .eq('id', id)
        .eq('status', 'active')
        .select('id');
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    async markExpired(id: string): Promise<void> {
      const { error } = await db
        .from('goals')
        .update({ status: 'expired' })
        .eq('id', id)
        .eq('status', 'active');
      if (error) throw error;
    },
    async updateActive(
      userId: string,
      set: { shared?: boolean; status?: 'abandoned' },
    ): Promise<void> {
      const { error } = await db
        .from('goals')
        .update(set)
        .eq('user_id', userId)
        .eq('status', 'active');
      if (error) throw error;
    },
    async reachedSharedSince(userIds: string[], sinceIso: string): Promise<GoalRow[]> {
      const { data, error } = await db
        .from('goals')
        .select(COLS)
        .in('user_id', userIds)
        .eq('status', 'reached')
        .eq('shared', true)
        .gte('reached_at', sinceIso)
        .order('reached_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    async cheersFor(goalIds: string[]): Promise<{ goal_id: string; user_id: string }[]> {
      const { data, error } = await db
        .from('goal_cheers')
        .select('goal_id, user_id')
        .in('goal_id', goalIds);
      if (error) throw error;
      return (data ?? []) as { goal_id: string; user_id: string }[];
    },
    // False when this user had already cheered (primary key conflict).
    async insertCheer(goalId: string, userId: string): Promise<boolean> {
      const { error } = await db.from('goal_cheers').insert({ goal_id: goalId, user_id: userId });
      if ((error as { code?: string } | null)?.code === '23505') return false;
      if (error) throw error;
      return true;
    },
  };
}
export type GoalsRepository = ReturnType<typeof createGoalsRepository>;
