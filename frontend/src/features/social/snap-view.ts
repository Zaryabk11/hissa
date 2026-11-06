import type { FriendRow } from './api/friends';

export type SnapView = { phase: 'warn' | 'opening' | 'shown' | 'gone' | 'failed' };
export type SnapEvent = 'press' | 'opened' | 'gone' | 'failed';

/** The open call is only ever started by `press`; every other event is ignored unless an open is in flight. */
export function snapViewReducer(state: SnapView, event: SnapEvent): SnapView {
  if (event === 'press') return state.phase === 'warn' || state.phase === 'failed' ? { phase: 'opening' } : state;
  if (state.phase !== 'opening') return state;
  return { phase: event === 'opened' ? 'shown' : event };
}

export const snapDataUri = (image: string, mimeType: string) => `data:${mimeType};base64,${image}`;

export function snapAge(sentAt: string, now = Date.now()): string {
  const min = Math.floor((now - Date.parse(sentAt)) / 60_000);
  if (min < 1) return 'just now';
  return min < 60 ? `${min}m ago` : `${Math.floor(min / 60)}h ago`;
}

export function snapExpiresIn(expiresAt: string, now = Date.now()): string {
  const h = Math.floor((Date.parse(expiresAt) - now) / 3_600_000);
  return h < 1 ? 'expires in under 1h' : `expires in ${h}h`;
}

export const canCheerStreak = (row: FriendRow) => row.loggedToday && row.streak >= 3;

export const unreadTotal = (notificationsUnread: number, snaps: number) => notificationsUnread + snaps;

export type ReportState = 'idle' | 'sending' | 'sent' | 'failed';

/** Report button state: a failed send can be retried, a sent report hides the button. */
export function reportReducer(state: ReportState, event: 'send' | 'sent' | 'failed'): ReportState {
  if (event === 'send') return state === 'idle' || state === 'failed' ? 'sending' : state;
  return state === 'sending' ? event : state;
}
