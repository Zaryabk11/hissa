import { apiAuthed } from '../../../shared/api/client';
import type { ApiMeal } from '../../core/api';
import type { HistoryDay } from '../history-view';

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
});

export const getHistory = (days = 14) => apiAuthed<{ days: HistoryDay[] }>(`/api/meals/history?days=${days}`);
export const getMeal = (id: string) => apiAuthed<{ meal: ApiMeal }>(`/api/meals/${encodeURIComponent(id)}`);
export const updateMeal = (id: string, items: { slug: string; qty: number }[]) =>
  apiAuthed<{ meal: ApiMeal }>(`/api/meals/${encodeURIComponent(id)}`, send('PATCH', { items }));
// The API answers 204 with no body; apiAuthed returns undefined for that.
export const deleteMeal = (id: string) => apiAuthed<void>(`/api/meals/${encodeURIComponent(id)}`, send('DELETE'));
