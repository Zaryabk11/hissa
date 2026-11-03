import { describe, expect, it } from 'vitest';
import type { WeekDay } from './api/week';
import { weekView } from './week-view';

// 2026-11-01 is a Sunday.
const days = (list: [string, number, number][]): WeekDay[] =>
  list.map(([day, totalCalories, mealCount]) => ({ day, totalCalories, mealCount }));
const emptyWeek = days([
  ['2026-10-26', 0, 0],
  ['2026-10-27', 0, 0],
  ['2026-10-28', 0, 0],
  ['2026-10-29', 0, 0],
  ['2026-10-30', 0, 0],
  ['2026-10-31', 0, 0],
  ['2026-11-01', 0, 0],
]);
const withDays = (patch: Record<number, [number, number]>) =>
  emptyWeek.map((d, i) =>
    patch[i] ? { ...d, totalCalories: patch[i][0], mealCount: patch[i][1] } : d,
  );

describe('weekView', () => {
  it('labels weekdays from the date string, across a month boundary', () => {
    const v = weekView(emptyWeek, 2000);
    expect(v.bars.map((b) => b.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(v.bars[0].a11y).toBe('Monday: nothing logged');
  });
  it('marks only the last day as today', () => {
    expect(weekView(emptyWeek, 2000).bars.map((b) => b.isToday)).toEqual([
      false, false, false, false, false, false, true,
    ]);
  });
  it('treats a week with no meals as empty', () => {
    const v = weekView(emptyWeek, 2000);
    expect(v.empty).toBe(true);
    expect(v.bars.every((b) => b.state === 'empty' && b.fraction === 0)).toBe(true);
    expect(v.summary).toBeNull();
  });
  it('sizes bars against the budget and sets states for a partial week', () => {
    const v = weekView(withDays({ 0: [1000, 2], 3: [1900, 3], 6: [1450, 1] }), 2000);
    expect(v.empty).toBe(false);
    expect(v.bars[0]).toMatchObject({ fraction: 0.5, state: 'under' });
    expect(v.bars[3]).toMatchObject({ fraction: 0.95, state: 'at' });
    expect(v.bars[6]).toMatchObject({ state: 'under', a11y: 'Sunday: about 1,450 kcal, an estimate' });
    expect(v.bars[1]).toMatchObject({ fraction: 0, state: 'empty' });
    expect(v.budgetFraction).toBe(1);
  });
  it('keeps an over-budget day calm and scales against the largest day', () => {
    const v = weekView(withDays({ 2: [3000, 4], 4: [1500, 1] }), 2000);
    expect(v.bars[2]).toMatchObject({ state: 'over', fraction: 1 });
    expect(v.bars[4].fraction).toBe(0.5);
    expect(v.budgetFraction).toBeCloseTo(2 / 3);
  });
  it('summarises logged days and their rounded average, as an estimate', () => {
    const v = weekView(withDays({ 0: [1000, 1], 1: [1501, 2], 5: [0, 0] }), 2000);
    expect(v.summary).toBe('Logged 2 of 7 days. Average about 1,251 kcal a day, an estimate.');
  });
  it('does not divide by a zero budget', () => {
    const v = weekView(withDays({ 1: [800, 1] }), 0);
    expect(v.bars[1].fraction).toBe(1);
    expect(v.bars[1].state).toBe('over');
    expect(v.budgetFraction).toBe(0);
    expect(Number.isFinite(v.bars[0].fraction)).toBe(true);
  });
});
