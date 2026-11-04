import type { GoalType } from '../notifications';
import type { PersonCard } from '../profiles';

export type GoalStatus = 'active' | 'reached' | 'abandoned' | 'expired';

export type GoalInput = { type: GoalType; target: number; windowDays?: number; shared: boolean };
// Only these fields ever leave the module; a friend sees them for a shared goal.
export type Goal = {
  id: string;
  type: GoalType;
  target: number;
  windowDays: number | null;
  startDay: string;
  status: GoalStatus;
  shared: boolean;
  progress: number;
  title: string;
};
export type FriendGoal = {
  userId: string;
  goalId: string;
  title: string;
  progress: number;
  target: number;
};
export type Celebration = {
  goalId: string;
  actor: PersonCard;
  title: string;
  reachedAt: string;
  cheers: number;
  cheeredByMe: boolean;
};

// A row of public.goals as the repository reads it.
export type GoalRow = {
  id: string;
  user_id: string;
  type: GoalType;
  target: number;
  window_days: number | null;
  start_day: string;
  status: GoalStatus;
  shared: boolean;
  reached_at: string | null;
};
