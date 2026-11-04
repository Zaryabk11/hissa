import type { FriendRow } from './api/friends';
import type { Goal } from './api/goals';
import type { NotificationItem } from './api/notifications';
import { socialContent } from './content';

export type RowStatus = 'logged' | 'not_yet' | 'lost';

export function friendStatus(row: FriendRow): RowStatus {
  if (row.loggedToday) return 'logged';
  return row.streak === 0 ? 'lost' : 'not_yet';
}

export const canNudge = (row: FriendRow) => friendStatus(row) !== 'logged' && !row.nudgedToday;

export const groupLine = (loggedCount: number, total: number) =>
  total === 0 ? null : `${loggedCount} of ${total} ${total === 1 ? 'friend' : 'friends'} logged today`;

export const goalProgressLine = (g: Goal) =>
  `${g.progress} of ${g.target}${g.type === 'streak' ? ' days' : ''}`;

export function validUsername(input: string): string | null {
  const name = input.trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(name) ? name : null;
}

export function notificationLine(n: NotificationItem): string {
  const who = n.actor.username ?? n.actor.displayName ?? socialContent.someone;
  const goal = n.kind === 'goal_reached' && n.goalTitle ? `: ${n.goalTitle}` : '';
  return `${who} ${socialContent.notification[n.kind]}${goal}`;
}
