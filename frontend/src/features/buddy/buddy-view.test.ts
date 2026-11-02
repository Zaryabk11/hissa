import { describe, expect, it } from 'vitest';
import { buddyView, normalizeCode } from './buddy-view';
import type { BuddyStatus } from './api/buddy';

const base: BuddyStatus = {
  pairStatus: 'none',
  pendingInviteCode: null,
  streak: 0,
  ownLoggedToday: false,
  buddyLoggedToday: null,
  unreadNudge: false,
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
      unreadNudge: true,
    });
  });

  it('cannot nudge a buddy who already logged today', () => {
    const view = buddyView({ ...base, pairStatus: 'active', buddyLoggedToday: true });
    expect(view).toMatchObject({ kind: 'active', canNudge: false });
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
