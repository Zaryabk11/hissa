import type { GoalType } from '../notifications';

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

// Only days on or after startDay count, so an older streak never completes a new goal.
export function goalProgress(
  g: { type: GoalType; target: number; windowDays: number | null; startDay: string },
  loggedDays: string[],
  today: string,
): { progress: number; reached: boolean; expired: boolean } {
  const days = [...new Set(loggedDays)].filter((d) => d >= g.startDay).sort();
  if (g.type === 'streak') {
    let run = 0;
    let best = 0;
    days.forEach((d, i) => {
      run = i > 0 && days[i - 1] === addDays(d, -1) ? run + 1 : 1;
      best = Math.max(best, run);
    });
    const progress = Math.min(best, g.target);
    return { progress, reached: progress >= g.target, expired: false };
  }
  const end = addDays(g.startDay, (g.windowDays ?? 0) - 1);
  const progress = Math.min(days.filter((d) => d <= end).length, g.target);
  const reached = progress >= g.target;
  return { progress, reached, expired: !reached && today > end };
}
