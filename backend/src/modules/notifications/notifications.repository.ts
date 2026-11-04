import type { Db } from '../../shared/db';
import type { GoalRow, NewNotification, NotificationRow } from './notifications.types';

export function createNotificationsRepository(db: Db) {
  return {
    async insert(n: NewNotification): Promise<void> {
      const { error } = await db.from('notifications').insert({
        user_id: n.userId,
        kind: n.kind,
        actor_id: n.actorId,
        goal_id: n.goalId ?? null,
        day: n.day ?? null,
      });
      if (error) throw error;
    },
    async list(userId: string): Promise<NotificationRow[]> {
      const { data, error } = await db
        .from('notifications')
        .select('id, kind, actor_id, goal_id, created_at, read_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
    async unreadCount(userId: string): Promise<number> {
      const { count, error } = await db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    // goal_id has no foreign key, so goals are read in a second query rather than a join.
    async goalsByIds(ids: string[]): Promise<GoalRow[]> {
      const { data, error } = await db
        .from('goals')
        .select('id, type, target, window_days')
        .in('id', ids);
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    async markAllRead(userId: string): Promise<void> {
      const { error } = await db
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    async nudgeRecipients(actorId: string, day: string): Promise<string[]> {
      const { data, error } = await db
        .from('notifications')
        .select('user_id')
        .eq('kind', 'nudge')
        .eq('actor_id', actorId)
        .eq('day', day);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id as string);
    },
  };
}
export type NotificationsRepository = ReturnType<typeof createNotificationsRepository>;
