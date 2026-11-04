import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import { pktDay, pktDayBounds } from '../../shared/time/pkt';
import type { FriendsService } from '../friends';
import { formatGoalTitle, type NotificationsService } from '../notifications';
import type { ProfilesService } from '../profiles';
import type { StreaksService } from '../streaks';
import type { GoalsRepository } from './goals.repository';
import type { Celebration, Goal, GoalInput, GoalRow } from './goals.types';
import { goalProgress } from './progress';

const CELEBRATION_MS = 48 * 60 * 60 * 1000;

interface GoalsDeps {
  repository: GoalsRepository;
  streaks: StreaksService;
  friends: FriendsService;
  notifications: NotificationsService;
  profiles: ProfilesService;
}

const toProgressInput = (r: GoalRow) => ({
  type: r.type,
  target: r.target,
  windowDays: r.window_days,
  startDay: r.start_day,
});
const toGoal = (r: GoalRow, progress: number): Goal => ({
  id: r.id,
  type: r.type,
  target: r.target,
  windowDays: r.window_days,
  startDay: r.start_day,
  status: r.status,
  shared: r.shared,
  progress,
  title: formatGoalTitle(r.type, r.target, r.window_days),
});

export function createGoalsService({
  repository,
  streaks,
  friends,
  notifications,
  profiles,
}: GoalsDeps) {
  // The caller's active goal with its progress; a goal whose window passed is settled to expired.
  async function active(
    userId: string,
    now: Date,
  ): Promise<{ row: GoalRow; progress: ReturnType<typeof goalProgress> } | null> {
    const row = await repository.findActive(userId);
    if (!row) return null;
    const today = pktDay(now);
    const logged = await streaks.loggedDays(userId, row.start_day, today);
    const progress = goalProgress(toProgressInput(row), logged, today);
    if (progress.expired) {
      await repository.markExpired(row.id);
      return null;
    }
    return { row, progress };
  }

  return {
    async getMine(userId: string, now = new Date()): Promise<Goal | null> {
      const a = await active(userId, now);
      if (a) return toGoal(a.row, a.progress.progress);
      const { startIso, endIso } = pktDayBounds(pktDay(now));
      const done = await repository.findReachedBetween(userId, startIso, endIso);
      return done ? toGoal(done, done.target) : null;
    },

    async create(userId: string, input: GoalInput, now = new Date()): Promise<Goal> {
      if (await active(userId, now)) throw new ConflictError('You already have an active goal');
      try {
        const row = await repository.insert(userId, {
          type: input.type,
          target: input.target,
          windowDays: input.type === 'window' ? (input.windowDays ?? null) : null,
          startDay: pktDay(now),
          shared: input.shared,
        });
        return toGoal(row, 0);
      } catch (e) {
        // 23505: a concurrent create won the one-active-goal index.
        if ((e as { code?: string }).code === '23505')
          throw new ConflictError('You already have an active goal');
        throw e;
      }
    },

    async update(
      userId: string,
      patch: { shared?: boolean; abandon?: boolean },
      now = new Date(),
    ): Promise<Goal | null> {
      if (patch.abandon) {
        await repository.updateActive(userId, { status: 'abandoned' });
        return null;
      }
      const a = await active(userId, now);
      if (!a) return null;
      if (patch.shared === undefined) return toGoal(a.row, a.progress.progress);
      await repository.updateActive(userId, { shared: patch.shared });
      return toGoal({ ...a.row, shared: patch.shared }, a.progress.progress);
    },

    // Called after a meal save. The conditional update lets only one concurrent save notify.
    async onMealSaved(userId: string, now = new Date()): Promise<void> {
      const a = await active(userId, now);
      if (!a?.progress.reached) return;
      if (!(await repository.markReached(a.row.id, now.toISOString()))) return;
      if (!a.row.shared) return;
      const ids = await friends.friendIds(userId);
      await Promise.all(
        ids.map((id) =>
          notifications.notify({
            userId: id,
            kind: 'goal_reached',
            actorId: userId,
            goalId: a.row.id,
          }),
        ),
      );
    },

    async celebrations(userId: string, now = new Date()): Promise<Celebration[]> {
      const friendIds = await friends.friendIds(userId);
      if (!friendIds.length) return [];
      const rows = await repository.reachedSharedSince(
        friendIds,
        new Date(now.getTime() - CELEBRATION_MS).toISOString(),
      );
      if (!rows.length) return [];
      const [cheers, cards] = await Promise.all([
        repository.cheersFor(rows.map((r) => r.id)),
        profiles.getCards(rows.map((r) => r.user_id)),
      ]);
      // A cheer from someone the viewer is no longer friends with is not shown.
      const visible = (c: { user_id: string }) =>
        c.user_id === userId || friendIds.includes(c.user_id);
      return rows.flatMap((r): Celebration[] => {
        const actor = cards.find((c) => c.userId === r.user_id);
        if (!actor || !r.reached_at) return [];
        const mine = cheers.filter((c) => c.goal_id === r.id && visible(c));
        return [
          {
            goalId: r.id,
            actor,
            title: formatGoalTitle(r.type, r.target, r.window_days),
            reachedAt: r.reached_at,
            cheers: mine.length,
            cheeredByMe: mine.some((c) => c.user_id === userId),
          },
        ];
      });
    },

    async cheer(userId: string, goalId: string): Promise<void> {
      const goal = await repository.findById(goalId);
      if (!goal) throw new NotFoundError('Goal not found');
      if (goal.user_id === userId) throw new ValidationError('You cannot cheer your own goal');
      // Same 404 for a stranger and a private goal, so existence does not leak.
      if (
        !goal.shared ||
        goal.status !== 'reached' ||
        !(await friends.areFriends(userId, goal.user_id))
      )
        throw new NotFoundError('Goal not found');
      if (await repository.insertCheer(goalId, userId))
        await notifications.notify({
          userId: goal.user_id,
          kind: 'cheer',
          actorId: userId,
          goalId,
        });
    },
  };
}
export type GoalsService = ReturnType<typeof createGoalsService>;
