import { describe, expect, it } from 'vitest';
import type { ApiMeal } from '../core/api';
import { historyContent } from './content';
import {
  canSave,
  confirmedLines,
  dayRows,
  editTotal,
  failureKind,
  isChanged,
  kcalLabel,
  mealDateLabel,
  mealRow,
  removeLine,
  savePayload,
  saveFailureText,
  stepLine,
} from './history-view';

const item = (dish: string | null, qty: number | null) => ({
  predictedDish: dish,
  predictedPortion: qty,
  confirmedDish: dish,
  confirmedPortion: qty,
  confidence: 0.9,
});
const meal = (id: string, eatenAt: string, totalCalories: number, items = [item('roti', 2), item('daal', 1)]): ApiMeal => ({
  id,
  eatenAt,
  totalCalories,
  items,
});

describe('grouping and ordering', () => {
  const days = [
    { day: '2026-11-01', totalCalories: 500, meals: [meal('a', '2026-11-01T08:00:00Z', 500)] },
    { day: '2026-11-03', totalCalories: 900, meals: [meal('b', '2026-11-03T08:00:00Z', 400), meal('c', '2026-11-03T13:00:00Z', 500)] },
  ];

  it('puts the newest day first and the newest meal first, with labelled totals', () => {
    const rows = dayRows(days);
    expect(rows.map((d) => d.day)).toEqual(['2026-11-03', '2026-11-01']);
    expect(rows[0]!.heading).toBe('Tuesday, 3 Nov');
    expect(rows[0]!.total).toBe('About 900 kcal, an estimate');
    expect(rows[0]!.meals.map((m) => m.id)).toEqual(['c', 'b']);
  });

  it('does not mutate its input and handles no days', () => {
    const copy = JSON.stringify(days);
    dayRows(days);
    expect(JSON.stringify(days)).toBe(copy);
    expect(dayRows([])).toEqual([]);
  });
});

describe('labels', () => {
  it('formats kcal as a rounded estimate with a thousands separator', () => {
    expect(kcalLabel(1234.6)).toBe('About 1,235 kcal, an estimate');
    expect(kcalLabel(0)).toBe('About 0 kcal, an estimate');
  });

  it('labels a meal date with the weekday', () => {
    expect(mealDateLabel('2026-11-03T12:00:00')).toBe('Tuesday, 3 Nov');
  });

  it('names dishes from the catalog, skips unconfirmed ones and falls back kindly', () => {
    const row = mealRow(meal('a', '2026-11-01T08:00:00Z', 310, [item('roti', 2), item('daal', 1), { ...item('rice', 1), confirmedDish: null, confirmedPortion: null }]));
    expect(row.names).toBe('Roti, Daal');
    expect(row.time).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/);
    expect(row.kcal).toBe('About 310 kcal, an estimate');
    expect(mealRow(meal('z', '2026-11-01T08:00:00Z', 0, [])).names).toBe(historyContent.fallbackName);
  });
});

describe('edit state', () => {
  const m = meal('a', '2026-11-01T08:00:00Z', 310);

  it('reads only confirmed dishes as lines', () => {
    expect(confirmedLines(m)).toEqual([
      { dishId: 'roti', qty: 2 },
      { dishId: 'daal', qty: 1 },
    ]);
  });

  it('is unchanged until a portion or a dish changes', () => {
    const lines = confirmedLines(m);
    expect(isChanged(lines, m)).toBe(false);
    expect(canSave(lines, m)).toBe(false);
    const more = stepLine(lines, 0, 1);
    expect(more[0]!.qty).toBe(3);
    expect(isChanged(more, m)).toBe(true);
    expect(canSave(more, m)).toBe(true);
    expect(isChanged(stepLine(more, 0, -1), m)).toBe(false);
  });

  it('steps katori by half and keeps portions between one step and 20', () => {
    const lines = confirmedLines(m);
    expect(stepLine(lines, 1, 1)[1]!.qty).toBe(1.5);
    expect(stepLine(lines, 1, -1)[1]!.qty).toBe(0.5);
    expect(stepLine(stepLine(lines, 1, -1), 1, -1)[1]!.qty).toBe(0.5);
  });

  it('removes a dish only while at least one remains', () => {
    const lines = confirmedLines(m);
    const one = removeLine(lines, 0);
    expect(one).toEqual([{ dishId: 'daal', qty: 1 }]);
    expect(removeLine(one, 0)).toEqual(one);
    expect(canSave(one, m)).toBe(true);
    expect(canSave([], m)).toBe(false);
  });

  it('totals kcal with the nutrition helpers and builds the PATCH body', () => {
    const lines = confirmedLines(m);
    expect(editTotal(lines)).toBe(2 * 110 + 150);
    expect(savePayload(lines)).toEqual({
      items: [
        { slug: 'roti', qty: 2 },
        { slug: 'daal', qty: 1 },
      ],
    });
  });
});

describe('failures', () => {
  it('tells a missing meal from other load errors', () => {
    expect(failureKind(404)).toBe('gone');
    expect(failureKind(500)).toBe('error');
    expect(failureKind(undefined)).toBe('error');
  });

  it('answers a 400 on save with a kind message that keeps the edit', () => {
    expect(saveFailureText(400)).toBe(historyContent.detail.saveInvalid);
    expect(saveFailureText(500)).toBe(historyContent.detail.saveError);
  });
});

describe('copy', () => {
  const flat = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : typeof v === 'function' ? flat(v('x')) : v && typeof v === 'object' ? Object.values(v).flatMap(flat) : [];
  const banned = /medical|doctor|diagnos|disease|diabet|cure|treat|unhealthy|healthy|\bbad\b|guilt|cheat|punish|burn|\bfat\b|weight loss|don'?t eat|do not eat|should(n'?t| not) eat|avoid|too much|caused|because of/i;

  it('has no medical, causal or "don\'t eat" wording', () => {
    for (const text of flat(historyContent)) expect(text, text).not.toMatch(banned);
  });

  it('labels every kcal number as an estimate', () => {
    expect(historyContent.kcal('1')).toMatch(/^About 1 kcal, an estimate$/);
  });
});
