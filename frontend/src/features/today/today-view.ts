import type { BuddyStatus } from '../buddy/api/buddy';
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

export type BuddyCard =
  | { kind: 'invite' }
  | { kind: 'pending' }
  | { kind: 'active'; streak: number; line: string; canNudge: boolean; nudged: boolean };

/** Only whitelisted BuddyStatus fields reach Today: no meals, calories or feelings. Null means the status could not load. */
export function buddyCard(b: BuddyStatus | null): BuddyCard | null {
  if (!b) return null;
  if (b.pairStatus === 'pending') return { kind: 'pending' };
  if (b.pairStatus !== 'active') return { kind: 'invite' };
  const buddy = c.streak.buddyFallback;
  const theirs = b.buddyLoggedToday === true;
  const line = theirs
    ? b.ownLoggedToday
      ? c.streak.both(buddy)
      : c.streak.buddyOnly(buddy)
    : b.ownLoggedToday
      ? c.streak.pending(buddy)
      : c.streak.neither(buddy);
  return {
    kind: 'active',
    streak: b.streak,
    line,
    canNudge: !theirs && !b.nudgedToday,
    nudged: !theirs && b.nudgedToday,
  };
}
