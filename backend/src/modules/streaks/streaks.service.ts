import { pktDay } from '../../shared/time/pkt';
import type { StreaksRepository } from './streaks.repository';

interface StreaksDeps {
  repository: StreaksRepository;
}
export type DayStreak = { streak: number; loggedToday: boolean };

function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}
// Consecutive logged days ending today, or yesterday while today is still in progress.
export function computeStreak(days: ReadonlySet<string> | string[], today: string): number {
  const set = new Set(days);
  let day = set.has(today) ? today : previousDay(today);
  let streak = 0;
  while (set.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

export function createStreaksService({ repository }: StreaksDeps) {
  return {
    async markMealSaved(userId: string, eatenAt: string): Promise<void> {
      await repository.markDay(userId, pktDay(new Date(eatenAt)));
    },
    async getStreaks(userIds: string[], now = new Date()): Promise<Record<string, DayStreak>> {
      const today = pktDay(now);
      const days = await repository.daysFor(userIds, today);
      return Object.fromEntries(
        userIds.map((id) => {
          const own = days[id] ?? [];
          return [id, { streak: computeStreak(own, today), loggedToday: own.includes(today) }];
        }),
      );
    },
    loggedDays(userId: string, fromDay: string, toDay: string): Promise<string[]> {
      return repository.loggedDays(userId, fromDay, toDay);
    },
  };
}
export type StreaksService = ReturnType<typeof createStreaksService>;
