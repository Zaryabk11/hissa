import { describe, expect, it } from 'vitest';
import { ringView, streakCard } from './today-view';

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

describe('streakCard', () => {
  it('hides when the status did not load', () => {
    expect(streakCard(null)).toEqual({ kind: 'hidden' });
  });
  it('shows only the streak and whether you logged today', () => {
    expect(streakCard({ streak: 4, loggedToday: true })).toEqual({
      kind: 'streak',
      streak: 4,
      loggedToday: true,
    });
    expect(streakCard({ streak: 0, loggedToday: false })).toEqual({
      kind: 'streak',
      streak: 0,
      loggedToday: false,
    });
  });
});
