import { apiAuthed } from '../../../shared/api/client';

export type BuddyStatus = {
  pairStatus: 'none' | 'pending' | 'active';
  pendingInviteCode: string | null;
  streak: number;
  ownLoggedToday: boolean;
  buddyLoggedToday: boolean | null;
  unreadNudge: boolean;
};
export type InvitationPreview = { code: string; status: 'pending' };

const post = (path: string) => apiAuthed<void>(path, { method: 'POST' });

export const getBuddyStatus = () => apiAuthed<BuddyStatus>('/api/streaks');
export const createInvite = () =>
  apiAuthed<{ code: string; linkPath: string }>('/api/streaks/invites', { method: 'POST' });
export const previewInvite = (code: string) =>
  apiAuthed<InvitationPreview>(`/api/streaks/invites/${code}`);
export const respondInvite = (code: string, decision: 'accept' | 'decline') =>
  post(`/api/streaks/invites/${code}/${decision}`);
export const endPair = () => post('/api/streaks/end');
export const sendNudge = () => post('/api/streaks/nudge');
export const ackNudge = () => post('/api/streaks/nudge/ack');
