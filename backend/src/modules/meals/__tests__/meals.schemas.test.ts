import { describe, expect, it } from 'vitest';
import { saveMealBodySchema } from '../meals.schemas';

const item = {
  predictedDish: 'roti',
  predictedPortion: 2,
  confirmedDish: 'roti',
  confirmedPortion: 2,
  confidence: 0.9,
};
const ok = (items: unknown[]) => saveMealBodySchema.safeParse({ items }).success;

describe('saveMealBodySchema', () => {
  it('accepts a valid item and a user-added item', () => {
    expect(ok([item])).toBe(true);
    expect(
      ok([
        {
          predictedDish: null,
          predictedPortion: null,
          confirmedDish: 'daal',
          confirmedPortion: 1,
          confidence: null,
        },
      ]),
    ).toBe(true);
  });

  it('accepts a removed item (predicted only)', () => {
    expect(ok([{ ...item, confirmedDish: null, confirmedPortion: null }])).toBe(true);
  });

  it('rejects 0 and 11 items', () => {
    expect(ok([])).toBe(false);
    expect(ok(Array.from({ length: 11 }, () => item))).toBe(false);
    expect(ok(Array.from({ length: 10 }, () => item))).toBe(true);
  });

  it('rejects an item with neither predicted nor confirmed dish', () => {
    expect(ok([{ ...item, predictedDish: null, confirmedDish: null }])).toBe(false);
  });

  it('treats an unknown predicted dish as no dish', () => {
    const unknown = { ...item, predictedDish: 'unknown', predictedPortion: 0, confidence: 0 };
    expect(ok([{ ...unknown, confirmedDish: null, confirmedPortion: null }])).toBe(false);
    expect(ok([unknown])).toBe(true);
  });

  it.each([0, -1, NaN, Infinity, 1000])('rejects confirmedPortion %s', (confirmedPortion) => {
    expect(ok([{ ...item, confirmedPortion }])).toBe(false);
  });

  it('rejects a confirmed dish without a portion', () => {
    expect(ok([{ ...item, confirmedPortion: null }])).toBe(false);
  });

  it.each([-0.1, 1.1])('rejects confidence %s', (confidence) => {
    expect(ok([{ ...item, confidence }])).toBe(false);
  });

  it('rejects a confirmedPortion on a removed item', () => {
    expect(ok([{ ...item, confirmedDish: null, confirmedPortion: 2 }])).toBe(false);
  });

  it.each([0, 0.5, 20, null])('accepts predictedPortion %s', (predictedPortion) => {
    expect(ok([{ ...item, predictedPortion }])).toBe(true);
  });

  it.each([-1, 20.5, 1000, NaN, Infinity])('rejects predictedPortion %s', (predictedPortion) => {
    expect(ok([{ ...item, predictedPortion }])).toBe(false);
  });
});
