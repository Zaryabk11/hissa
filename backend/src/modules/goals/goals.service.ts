import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { pktDay, pktDayBounds } from '../../shared/time/pkt';
import type { FriendsService } from '../friends';
import { formatGoalTitle, type NotificationsService } from '../notifications';
import type { ProfilesService } from '../profiles';
import type { StreaksService } from '../streaks';
import type { GoalsRepository } from './goals.repository';
import type { Celebration, FriendGoal, Goal, GoalInput, GoalRow } from './goals.types';
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
  // Flips active -> reached once (conditional update) and tells friends if shared.
  async function reach(row: GoalRow, now: Date): Promise<void> {
    if (!(await repository.markReached(row.id, now.toISOString()))) return;
    if (!row.shared) return;
    const ids = await friends.friendIds(row.user_id);
    // The goal is already reached and committed: a failed notification is logged, never thrown.
    const results = await Promise.allSettled(
      ids.map((id) =>
        notifications.notify({
          userId: id,
          kind: 'goal_reached',
          actorId: row.user_id,
          goalId: row.id,
        }),
      ),
    );
    for (const r of results)
      if (r.status === 'rejected')
        logger.warn('Goal reached notification failed', { goalId: row.id });
  }

  // The caller's open goal with its progress. Settles first: a passed window becomes expired
  // (returns null), a met target becomes reached (also self-heals a missed onMealSaved).
  async function current(
    userId: string,
    now: Date,
  ): Promise<{ row: GoalRow; progress: number; reached: boolean } | null> {
    const row = await repository.findActive(userId);
    if (!row) return null;
    const today = pktDay(now);
    const logged = await streaks.loggedDays(userId, row.start_day, today);
    const p = goalProgress(toProgressInput(row), logged, today);
    if (p.expired) {
      await repository.markExpired(row.id);
      return null;
    }
    if (p.reached) await reach(row, now);
    return { row, progress: p.progress, reached: p.reached };
  }
  const asGoal = (c: { row: GoalRow; progress: number; reached: boolean }): Goal =>
    toGoal(c.reached ? { ...c.row, status: 'reached' } : c.row, c.progress);

  return {
    async getMine(userId: string, now = new Date()): Promise<Goal | null> {
      const c = await current(userId, now);
      if (c) return asGoal(c);
      const { startIso, endIso } = pktDayBounds(pktDay(now));
      const done = await repository.findReachedBetween(userId, startIso, endIso);
      return done ? toGoal(done, done.target) : null;
    },

    async create(userId: string, input: GoalInput, now = new Date()): Promise<Goal> {
      const open = await current(userId, now);
      if (open && !open.reached) throw new ConflictError('You already have an active goal');
      let row: GoalRow;
      try {
        row = await repository.insert(userId, {
          type: input.type,
          target: input.target,
          windowDays: input.type === 'window' ? (input.windowDays ?? null) : null,
          startDay: pktDay(now),
          shared: input.shared,
        });
      } catch (e) {
        // 23505: a concurrent create won the one-active-goal index.
        if ((e as { code?: string }).code === '23505')
          throw new ConflictError('You already have an active goal');
        throw e;
      }
      // Today may already be logged, so a new goal can start with progress or be met at once.
      const today = pktDay(now);
      const logged = await streaks.loggedDays(userId, today, today);
      const p = goalProgress(toProgressInput(row), logged, today);
      if (p.reached) await reach(row, now);
      return asGoal({ row, progress: p.progress, reached: p.reached });
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
      const c = await current(userId, now);
      // A goal just settled to reached is no longer active, so there is nothing to share.
      if (!c || c.reached) return c ? asGoal(c) : null;
      if (patch.shared === undefined) return asGoal(c);
      await repository.updateActive(userId, { shared: patch.shared });
      return asGoal({ ...c, row: { ...c.row, shared: patch.shared } });
    },

    // Called after a meal save. The conditional update lets only one concurrent save notify.
    async onMealSaved(userId: string, now = new Date()): Promise<void> {
      await current(userId, now);
    },

    async celebrations(userId: string, now = new Date()): Promise<Celebration[]> {
      const friendIds = await friends.friendIds(userId);
      if (!friendIds.length) return [];
      const rows = await repository.reachedSharedSince(
        friendIds,
        new Date(now.getTime() - CELEBRATION_MS).toISOString(),
      );
      if (!rows.length) return [];
      const owners = [...new Set(rows.map((r) => r.user_id))];
      const [cheers, cards, ownerFriends] = await Promise.all([
        repository.cheersFor(rows.map((r) => r.id)),
        profiles.getCards(owners),
        Promise.all(owners.map(async (o) => [o, await friends.friendIds(o)] as const)).then(
          (e) => new Map(e),
        ),
      ]);
      // A cheer disappears when the cheerer and the achiever stop being friends.
      const visible = (c: { user_id: string }, owner: string) =>
        c.user_id === userId || ownerFriends.get(owner)?.includes(c.user_id);
      return rows.flatMap((r): Celebration[] => {
        const actor = cards.find((c) => c.userId === r.user_id);
        if (!actor || !r.reached_at) return [];
        const mine = cheers.filter((c) => c.goal_id === r.id && visible(c, r.user_id));
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

    // Read-only: settling other users' goals stays with their own requests.
    async friendGoals(userId: string, now = new Date()): Promise<FriendGoal[]> {
      const friendIds = await friends.friendIds(userId);
      if (!friendIds.length) return [];
      const today = pktDay(now);
      const rows = await repository.activeSharedFor(friendIds);
      const out = await Promise.all(
        rows.map(async (r): Promise<FriendGoal | null> => {
          const p = goalProgress(
            toProgressInput(r),
            await streaks.loggedDays(r.user_id, r.start_day, today),
            today,
          );
          if (p.expired || p.reached) return null;
          return {
            userId: r.user_id,
            goalId: r.id,
            title: formatGoalTitle(r.type, r.target, r.window_days),
            progress: p.progress,
            target: r.target,
          };
        }),
      );
      return out.filter((g): g is FriendGoal => g !== null);
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
