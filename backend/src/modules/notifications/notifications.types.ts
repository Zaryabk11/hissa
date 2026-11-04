import type { PersonCard } from '../profiles';

export type NotificationKind =
  'friend_request' | 'request_accepted' | 'nudge' | 'goal_reached' | 'cheer';
export type GoalType = 'streak' | 'window';

export type NewNotification = {
  userId: string;
  kind: NotificationKind;
  actorId: string;
  goalId?: string;
  day?: string;
};
export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actor: PersonCard;
  goalTitle: string | null;
  createdAt: string;
  read: boolean;
};

// A row of public.notifications as the repository reads it.
export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  actor_id: string;
  goal_id: string | null;
  created_at: string;
  read_at: string | null;
};
export type GoalRow = { id: string; type: GoalType; target: number; window_days: number | null };

// The one place goal wording lives; goals imports it too.
export function formatGoalTitle(type: GoalType, target: number, windowDays: number | null): string {
  return type === 'streak' ? `Log ${target} days in a row` : `Log ${target} days in ${windowDays}`;
}
