import { describe, expect, it } from 'vitest';
import type { FriendRow } from './api/friends';
import type { NotificationItem } from './api/notifications';
import { canCheerStreak, snapAge, snapDataUri, snapViewReducer, snapExpiresIn, unreadTotal, type SnapView } from './snap-view';
import { notificationLine } from './social-view';

const warn: SnapView = { phase: 'warn' };
const row = (o: Partial<FriendRow>): FriendRow => ({ userId: 'u', username: 'a', displayName: null, streak: 3, loggedToday: true, nudgedToday: false, ...o });

describe('snapViewReducer', () => {
  it('ignores opened until the button is pressed', () => {
    expect(snapViewReducer(warn, 'opened')).toEqual(warn);
    expect(snapViewReducer(warn, 'gone')).toEqual(warn);
  });
  it('press then opened is shown', () => {
    const opening = snapViewReducer(warn, 'press');
    expect(opening.phase).toBe('opening');
    expect(snapViewReducer(opening, 'opened').phase).toBe('shown');
  });
  it('gone and failed come from opening; a failed open can be pressed again', () => {
    const opening = snapViewReducer(warn, 'press');
    expect(snapViewReducer(opening, 'gone').phase).toBe('gone');
    const failed = snapViewReducer(opening, 'failed');
    expect(failed.phase).toBe('failed');
    expect(snapViewReducer(failed, 'press').phase).toBe('opening');
  });
  it('a second press while opening or shown does nothing', () => {
    const opening = snapViewReducer(warn, 'press');
    expect(snapViewReducer(opening, 'press')).toEqual(opening);
    const shown = snapViewReducer(opening, 'opened');
    expect(snapViewReducer(shown, 'press')).toEqual(shown);
  });
});

describe('snap helpers', () => {
  it('builds a data URI', () => {
    expect(snapDataUri('abc', 'image/jpeg')).toBe('data:image/jpeg;base64,abc');
  });
  it('formats age and time left', () => {
    const now = Date.parse('2026-11-06T12:00:00Z');
    expect(snapAge('2026-11-06T11:59:40Z', now)).toBe('just now');
    expect(snapAge('2026-11-06T11:15:00Z', now)).toBe('45m ago');
    expect(snapAge('2026-11-06T07:00:00Z', now)).toBe('5h ago');
    expect(snapExpiresIn('2026-11-07T07:00:00Z', now)).toBe('expires in 19h');
    expect(snapExpiresIn('2026-11-06T12:20:00Z', now)).toBe('expires in under 1h');
    expect(snapExpiresIn('2026-11-06T11:00:00Z', now)).toBe('expires in under 1h');
  });
});

describe('canCheerStreak', () => {
  it('needs logged today and a streak of 3', () => {
    expect(canCheerStreak(row({ streak: 3 }))).toBe(true);
    expect(canCheerStreak(row({ streak: 2 }))).toBe(false);
    expect(canCheerStreak(row({ loggedToday: false, streak: 5 }))).toBe(false);
  });
});

describe('unreadTotal', () => {
  it('adds unopened snaps to unread notifications', () => {
    expect(unreadTotal(2, 3)).toBe(5);
  });
  it('opening the inbox clears notifications but keeps the snaps', () => {
    expect(unreadTotal(0, 3)).toBe(3);
  });
});

describe('cheer_streak notification', () => {
  it('reads "<name> cheered your streak"', () => {
    const n: NotificationItem = { id: '1', kind: 'cheer_streak', actor: { userId: 'u', username: 'ayesha', displayName: null }, goalTitle: null, createdAt: '2026-11-06T00:00:00Z', read: false };
    expect(notificationLine(n)).toBe('ayesha cheered your streak');
  });
});
