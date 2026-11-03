import { apiAuthed } from '../../../shared/api/client';
import type {
  Energy,
  Experiment,
  ExperimentAction,
  PatternCard,
  Question,
  Stomach,
  Symptom,
} from '../feel-view';

export type DueCheckin = { mealId: string; eatenAt: string; dishes: string[] } | null;

export const getDueCheckin = (skip: string[] = []) =>
  apiAuthed<DueCheckin>(`/api/feel/due${skip.length ? `?skip=${skip.join(',')}` : ''}`);
// The question is a nicety, so it gets a short timeout; callers fall back to fixed wording on any error.
export const getQuestion = (mealId: string) =>
  apiAuthed<Question>(`/api/feel/question/${encodeURIComponent(mealId)}`, {
    signal: AbortSignal.timeout(5_000),
  });
export const getPattern = () => apiAuthed<PatternCard>('/api/feel/pattern');
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

const postJson = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
export const createExperiment = (patternKey: string, action: ExperimentAction) =>
  apiAuthed<{ experiment: Experiment }>('/api/feel/experiments', postJson({ patternKey, action }));
export const getCurrentExperiment = () =>
  apiAuthed<{ experiment: Experiment | null }>('/api/feel/experiments/current');
export const markExperimentTried = (id: string, mealId: string) =>
  apiAuthed<{ experiment: Experiment }>(
    `/api/feel/experiments/${encodeURIComponent(id)}/tried`,
    postJson({ mealId }),
  );
