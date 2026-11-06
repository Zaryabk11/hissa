import { apiAuthed } from '../../../shared/api/client';
import type { PersonCard } from './friends';

export type SnapInboxItem = { id: string; sender: PersonCard; sentAt: string; expiresAt: string };
export type OpenedSnap = { image: string; mimeType: 'image/jpeg'; sender: PersonCard; sentAt: string; expiresAt: string };
export type ReportReason = 'spam' | 'inappropriate_photo' | 'harassment' | 'other';

export const getSnapInbox = () => apiAuthed<{ items: SnapInboxItem[] }>('/api/snaps/inbox');
// View once: the server marks the snap opened and returns the photo as base64.
export const openSnap = (id: string) => apiAuthed<OpenedSnap>(`/api/snaps/${id}/open`, { method: 'POST' });
export const reportSnap = (id: string, reason: ReportReason) =>
  apiAuthed<void>(`/api/snaps/${id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
