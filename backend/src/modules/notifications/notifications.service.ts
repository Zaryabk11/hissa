import { ConflictError } from '../../shared/errors';
import type { ProfilesService } from '../profiles';
import type { NotificationsRepository } from './notifications.repository';
import {
  formatGoalTitle,
  type NewNotification,
  type NotificationItem,
} from './notifications.types';

interface NotificationsDeps {
  repository: NotificationsRepository;
  profiles: ProfilesService;
}

export function createNotificationsService({ repository, profiles }: NotificationsDeps) {
  return {
    async notify(n: NewNotification): Promise<void> {
      try {
        await repository.insert(n);
      } catch (e) {
        // 23505: the one-nudge-per-day unique index.
        if ((e as { code?: string }).code === '23505')
          throw new ConflictError('Already nudged today');
        throw e;
      }
    },

    nudgesSentOn(actorId: string, day: string): Promise<string[]> {
      return repository.nudgeRecipients(actorId, day);
    },

    async list(userId: string): Promise<{ items: NotificationItem[]; unread: number }> {
      const [rows, unread] = await Promise.all([
        repository.list(userId),
        repository.unreadCount(userId),
      ]);
      const goalIds = [...new Set(rows.flatMap((r) => (r.goal_id ? [r.goal_id] : [])))];
      const [cards, goals] = await Promise.all([
        profiles.getCards([...new Set(rows.map((r) => r.actor_id))]),
        goalIds.length ? repository.goalsByIds(goalIds) : [],
      ]);
      const items = rows.flatMap((r): NotificationItem[] => {
        const actor = cards.find((c) => c.userId === r.actor_id);
        if (!actor) return [];
        const goal = goals.find((g) => g.id === r.goal_id);
        return [
          {
            id: r.id,
            kind: r.kind,
            actor,
            goalTitle: goal ? formatGoalTitle(goal.type, goal.target, goal.window_days) : null,
            createdAt: r.created_at,
            read: r.read_at !== null,
          },
        ];
      });
      return { items, unread };
    },

    markAllRead(userId: string): Promise<void> {
      return repository.markAllRead(userId);
    },
  };
}
export type NotificationsService = ReturnType<typeof createNotificationsService>;
