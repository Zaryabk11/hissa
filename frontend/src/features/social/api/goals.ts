import { apiAuthed } from '../../../shared/api/client';
import type { PersonCard } from './friends';

export type GoalType = 'streak' | 'window';
export type GoalInput = { type: GoalType; target: number; windowDays?: number; shared: boolean };
export type Goal = {
  id: string;
  type: GoalType;
  target: number;
  windowDays: number | null;
  startDay: string;
  status: 'active' | 'reached' | 'abandoned' | 'expired';
  shared: boolean;
  progress: number;
  title: string;
};
export type Celebration = {
  goalId: string;
  actor: PersonCard;
  title: string;
  reachedAt: string;
  cheers: number;
  cheeredByMe: boolean;
};

const json = { 'Content-Type': 'application/json' };

export const getMyGoal = () => apiAuthed<Goal | null>('/api/goals/mine');
export const createGoal = (input: GoalInput) =>
  apiAuthed<Goal>('/api/goals', { method: 'POST', headers: json, body: JSON.stringify(input) });
export const patchGoal = (p: { shared?: boolean; abandon?: boolean }) =>
  apiAuthed<Goal | null>('/api/goals/mine', { method: 'PATCH', headers: json, body: JSON.stringify(p) });
export const getCelebrations = () => apiAuthed<Celebration[]>('/api/goals/celebrations');
export const cheer = (goalId: string) =>
  apiAuthed<void>(`/api/goals/${goalId}/cheer`, { method: 'POST' });
