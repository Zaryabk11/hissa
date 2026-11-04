import { todayContent as c } from './content';

export function ringView(budget: number, eaten: number, empty: boolean) {
  const shown = Math.round(empty ? budget : Math.max(0, budget - eaten));
  return {
    shown,
    caption: empty ? c.ring.forToday : c.ring.left,
    fraction: budget > 0 ? eaten / budget : 0,
    // At or over budget: say it kindly (design k). There is never a red state.
    atBudget: !empty && budget > 0 && eaten >= budget,
  };
}

export type StreakStatus = { streak: number; loggedToday: boolean };
export type StreakCard = { kind: 'streak'; streak: number; loggedToday: boolean } | { kind: 'hidden' };

/** Your own streak only: no friend data reaches Today. Null means the status could not load. */
export function streakCard(s: StreakStatus | null): StreakCard {
  return s ? { kind: 'streak', streak: s.streak, loggedToday: s.loggedToday } : { kind: 'hidden' };
}
