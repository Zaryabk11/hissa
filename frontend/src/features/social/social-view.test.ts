import { describe, expect, it } from 'vitest';
import {
  canNudge,
  friendStatus,
  goalProgressLine,
  groupLine,
  notificationLine,
  validUsername,
} from './social-view';
import type { FriendRow } from './api/friends';
import type { Goal } from './api/goals';
import type { NotificationItem } from './api/notifications';

const row = (o: Partial<FriendRow>): FriendRow => ({
  userId: 'u',
  username: 'a',
  displayName: null,
  streak: 0,
  loggedToday: false,
  nudgedToday: false,
  ...o,
});

describe('friendStatus / canNudge', () => {
  it('maps logged, lost and not_yet', () => {
    expect(friendStatus(row({ loggedToday: true }))).toBe('logged');
    expect(friendStatus(row({ loggedToday: false, streak: 0 }))).toBe('lost');
    expect(friendStatus(row({ loggedToday: false, streak: 4 }))).toBe('not_yet');
  });

  it('cannot nudge a logged or already nudged friend', () => {
    expect(canNudge(row({ loggedToday: true }))).toBe(false);
    expect(canNudge(row({ streak: 4, nudgedToday: true }))).toBe(false);
    expect(canNudge(row({ streak: 4 }))).toBe(true);
  });
});

describe('groupLine', () => {
  it('counts friends, null when none', () => {
    expect(groupLine(4, 5)).toBe('4 of 5 friends logged today');
    expect(groupLine(0, 0)).toBeNull();
    expect(groupLine(1, 1)).toBe('1 of 1 friend logged today');
  });
});

describe('validUsername', () => {
  it('trims, lowercases and validates', () => {
    expect(validUsername(' Ayesha_1 ')).toBe('ayesha_1');
    expect(validUsername('ab')).toBeNull();
    expect(validUsername('a b c')).toBeNull();
    expect(validUsername('a'.repeat(21))).toBeNull();
  });
});

describe('goalProgressLine', () => {
  const g = { type: 'window', target: 5, windowDays: 7, progress: 5 } as Goal;
  it('formats both goal types', () => {
    expect(goalProgressLine(g)).toBe('5 of 5');
    expect(goalProgressLine({ ...g, type: 'streak', target: 3, windowDays: null, progress: 2 })).toBe(
      '2 of 3 days',
    );
  });
});

describe('notificationLine', () => {
  const kinds = ['friend_request', 'request_accepted', 'nudge', 'goal_reached', 'cheer'] as const;
  const item = (kind: NotificationItem['kind'], actor: NotificationItem['actor']): NotificationItem => ({
    id: '1',
    kind,
    actor,
    goalTitle: 'Log 3 days in a row',
    createdAt: '2026-11-05T00:00:00Z',
    read: false,
  });

  it('names the actor and never mentions meals', () => {
    for (const kind of kinds) {
      const line = notificationLine(item(kind, { userId: 'u', username: 'ayesha', displayName: 'Ayesha K' }));
      expect(line).toContain('ayesha');
      expect(line.toLowerCase()).not.toContain('meal');
    }
  });

  it('falls back to display name then Someone', () => {
    expect(notificationLine(item('nudge', { userId: 'u', username: null, displayName: 'Ayesha K' }))).toContain('Ayesha K');
    expect(notificationLine(item('nudge', { userId: 'u', username: null, displayName: null }))).toContain('Someone');
  });
});
