import { apiAuthed } from '../../../shared/api/client';

export const setUsername = (username: string) =>
  apiAuthed<void>('/api/profiles/me/username', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

export const getMyStreak = () => apiAuthed<{ streak: number; loggedToday: boolean }>('/api/streaks');
