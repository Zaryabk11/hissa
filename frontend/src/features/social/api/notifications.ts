import { apiAuthed } from '../../../shared/api/client';
import type { PersonCard } from './friends';

export type NotificationKind = 'friend_request' | 'request_accepted' | 'nudge' | 'goal_reached' | 'cheer' | 'cheer_streak';
export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actor: PersonCard;
  goalTitle: string | null;
  createdAt: string;
  read: boolean;
};

export const getInbox = () =>
  apiAuthed<{ items: NotificationItem[]; unread: number }>('/api/notifications');
export const markInboxRead = () => apiAuthed<void>('/api/notifications/read', { method: 'POST' });
