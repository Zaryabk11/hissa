import { apiAuthed } from '../../../shared/api/client';
import type { Energy, Stomach, Symptom } from '../feel-view';

export type DueCheckin = { mealId: string; eatenAt: string; dishes: string[] } | null;

export const getDueCheckin = (skip: string[] = []) =>
  apiAuthed<DueCheckin>(`/api/feel/due${skip.length ? `?skip=${skip.join(',')}` : ''}`);
export const submitCheckin = (body: {
  mealId: string;
  energy: Energy;
  stomach: Stomach;
  symptom?: Symptom;
}) =>
  apiAuthed<{ id: string }>('/api/feel/checkins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
