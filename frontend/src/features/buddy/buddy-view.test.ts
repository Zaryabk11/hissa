import { describe, expect, it } from 'vitest';
import { buddyView, daysLabel, httpStatus, normalizeCode, togetherLine } from './buddy-view';
import type { BuddyStatus } from './api/buddy';

const base: BuddyStatus = {
  pairStatus: 'none',
  pendingInviteCode: null,
  streak: 0,
  ownLoggedToday: false,
  buddyLoggedToday: null,
  unreadNudge: false,
  nudgedToday: false,
};

describe('buddyView', () => {
  it('none offers create and enter-code only', () => {
    expect(buddyView(base)).toEqual({ kind: 'none' });
  });

  it('pending shows the own invite code', () => {
    expect(buddyView({ ...base, pairStatus: 'pending', pendingInviteCode: 'ABC123' })).toEqual({
      kind: 'pending',
      code: 'ABC123',
    });
  });

  it('active exposes only both logged flags, the streak and the nudge state', () => {
    const view = buddyView({
      ...base,
      pairStatus: 'active',
      streak: 3,
      ownLoggedToday: true,
      buddyLoggedToday: false,
      unreadNudge: true,
    });
    expect(view).toEqual({
      kind: 'active',
      streak: 3,
      ownLoggedToday: true,
      buddyLoggedToday: false,
      canNudge: true,
      nudgeSent: false,
      unreadNudge: true,
    });
  });

  it('cannot nudge a buddy who already logged today', () => {
    const view = buddyView({ ...base, pairStatus: 'active', buddyLoggedToday: true });
    expect(view).toMatchObject({ kind: 'active', canNudge: false });
  });
});

describe('nudge state', () => {
  it('shows nudge sent instead of the button once the server says it was delivered', () => {
    const view = buddyView({ ...base, pairStatus: 'active', nudgedToday: true });
    expect(view).toMatchObject({ kind: 'active', canNudge: false, nudgeSent: true });
  });
  it('a buddy who logged needs no nudge and no nudge-sent label', () => {
    const view = buddyView({
      ...base,
      pairStatus: 'active',
      buddyLoggedToday: true,
      nudgedToday: true,
    });
    expect(view).toMatchObject({ kind: 'active', canNudge: false, nudgeSent: false });
  });
});

describe('httpStatus', () => {
  it('reads the status from an apiAuthed error', () => {
    expect(httpStatus(new Error('POST /api/streaks/nudge failed with 400'))).toBe(400);
  });
  it.each([
    new Error('Network request failed'),
    new Error('Sign in again to continue.'),
    'x',
    null,
  ])('is null for %j', (error) => {
    expect(httpStatus(error)).toBeNull();
  });
});

describe('normalizeCode', () => {
  it('uppercases and trims a valid code', () => {
    expect(normalizeCode(' abc123 ')).toBe('ABC123');
  });
  it.each(['', 'ABC12', 'ABC1234', 'ABC-12', 'ab c123'])('rejects %j', (input) => {
    expect(normalizeCode(input)).toBeNull();
  });
});

describe('daysLabel', () => {
  it.each([
    [0, 'days together'],
    [1, 'day together'],
    [12, 'days together'],
  ])('%j -> %s', (n, label) => {
    expect(daysLabel(n)).toBe(label);
  });
});

describe('togetherLine', () => {
  it.each([
    [true, true, 'You both logged today'],
    [true, false, "You logged, your buddy hasn't yet"],
    [false, true, "Your buddy logged, you haven't yet"],
    [false, false, 'Neither of you has logged yet today'],
  ])('own %j buddy %j', (own, buddy, line) => {
    expect(togetherLine(own, buddy)).toBe(line);
  });
});
