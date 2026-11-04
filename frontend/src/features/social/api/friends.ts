import { apiAuthed } from '../../../shared/api/client';

export type PersonCard = { userId: string; username: string | null; displayName: string | null };
export type FriendRow = PersonCard & { streak: number; loggedToday: boolean; nudgedToday: boolean };
export type FriendsOverview = {
  friends: FriendRow[];
  loggedCount: number;
  incoming: PersonCard[];
  outgoing: PersonCard[];
};

const send = (path: string, method: 'POST' | 'DELETE') => apiAuthed<void>(path, { method });

export const getOverview = () => apiAuthed<FriendsOverview>('/api/friends/overview');
export const searchPeople = (q: string) =>
  apiAuthed<PersonCard[]>(`/api/friends/search?q=${encodeURIComponent(q)}`);
export const sendRequest = (username: string) =>
  apiAuthed<void>('/api/friends/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
export const respondRequest = (userId: string, d: 'accept' | 'decline') =>
  send(`/api/friends/requests/${userId}/${d}`, 'POST');
export const removeFriend = (userId: string) => send(`/api/friends/${userId}`, 'DELETE');
export const nudgeFriend = (userId: string) => send(`/api/friends/${userId}/nudge`, 'POST');
