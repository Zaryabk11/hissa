import { describe, expect, it } from 'vitest';
import type { BuddyStatus } from '../buddy/api/buddy';
import { buddyCard, ringView } from './today-view';

const status = (patch: Partial<BuddyStatus>): BuddyStatus => ({
  pairStatus: 'active',
  pendingInviteCode: null,
  streak: 3,
  ownLoggedToday: true,
  buddyLoggedToday: false,
  unreadNudge: false,
  nudgedToday: false,
  ...patch,
});

describe('ringView', () => {
  it('shows the whole budget before the first meal', () => {
    expect(ringView(2000, 0, true)).toMatchObject({
      shown: 2000,
      caption: 'for today',
      atBudget: false,
    });
  });
  it('shows what is left, and never goes below zero', () => {
    expect(ringView(2000, 1500, false)).toMatchObject({
      shown: 500,
      caption: 'left',
      atBudget: false,
    });
    expect(ringView(2000, 2300, false)).toMatchObject({ shown: 0, atBudget: true, fraction: 1.15 });
  });
});

describe('buddyCard', () => {
  it('hides when the status did not load, invites when unpaired, waits when pending', () => {
    expect(buddyCard(null)).toBeNull();
    expect(buddyCard(status({ pairStatus: 'none' }))).toEqual({ kind: 'invite' });
    expect(buddyCard(status({ pairStatus: 'pending', pendingInviteCode: 'ABC123' }))).toEqual({
      kind: 'pending',
    });
  });
  it('offers a nudge only while the buddy has not logged and none was sent', () => {
    expect(buddyCard(status({}))).toMatchObject({
      kind: 'active',
      canNudge: true,
      nudged: false,
      line: "You logged, your buddy hasn't yet",
    });
    expect(buddyCard(status({ nudgedToday: true }))).toMatchObject({
      canNudge: false,
      nudged: true,
    });
    expect(buddyCard(status({ buddyLoggedToday: true }))).toMatchObject({
      canNudge: false,
      nudged: false,
      line: 'You and your buddy both logged today',
    });
  });
  it('exposes nothing beyond streak, line and nudge state', () => {
    expect(Object.keys(buddyCard(status({})) as object).sort()).toEqual([
      'canNudge',
      'kind',
      'line',
      'nudged',
      'streak',
    ]);
  });
});
