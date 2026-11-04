import { describe, expect, it } from 'vitest';
import { goalProgress } from '../progress';

const streak = { type: 'streak', target: 3, windowDays: null, startDay: '2026-11-05' } as const;
const window7 = { type: 'window', target: 5, windowDays: 7, startDay: '2026-11-05' } as const;

describe('goalProgress', () => {
  it('ignores a long streak from before the start day', () => {
    const before = ['2026-10-20', '2026-10-21', '2026-11-02', '2026-11-03', '2026-11-04'];
    expect(goalProgress(streak, before, '2026-11-05')).toEqual({
      progress: 0,
      reached: false,
      expired: false,
    });
  });

  it('reaches a streak goal with a fresh run from the start day', () => {
    const r = goalProgress(streak, ['2026-11-05', '2026-11-06', '2026-11-07'], '2026-11-07');
    expect(r).toMatchObject({ progress: 3, reached: true });
  });

  it('a gap resets the streak run', () => {
    const r = goalProgress(streak, ['2026-11-05', '2026-11-07', '2026-11-08'], '2026-11-08');
    expect(r).toMatchObject({ progress: 2, reached: false });
  });

  it('window goal is reached with enough days inside the window', () => {
    const days = ['2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09', '2026-11-11'];
    expect(goalProgress(window7, days, '2026-11-11')).toMatchObject({
      progress: 5,
      reached: true,
      expired: false,
    });
  });

  it('window goal expires after its last day when short, but not on the last day', () => {
    const days = ['2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09'];
    expect(goalProgress(window7, days, '2026-11-12')).toMatchObject({
      progress: 4,
      reached: false,
      expired: true,
    });
    expect(goalProgress(window7, days, '2026-11-11')).toMatchObject({
      reached: false,
      expired: false,
    });
  });

  it('window goal ignores days outside the window', () => {
    const days = ['2026-11-04', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
    expect(goalProgress(window7, days, '2026-11-15').progress).toBe(0);
  });
});
