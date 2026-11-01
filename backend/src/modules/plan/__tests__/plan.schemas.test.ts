import { describe, expect, it } from 'vitest';
import { planBodySchema } from '../plan.schemas';

const body = (units: number, n = 1) => ({
  items: Array.from({ length: n }, () => ({ slug: 'roti', units })),
});

describe('plan body schema', () => {
  it.each([0, -1, NaN, Infinity, 21])('rejects units %s', (units) => {
    expect(planBodySchema.safeParse(body(units)).success).toBe(false);
  });

  it('rejects an empty list and 11 items', () => {
    expect(planBodySchema.safeParse({ items: [] }).success).toBe(false);
    expect(planBodySchema.safeParse(body(1, 11)).success).toBe(false);
  });

  it('accepts 1 to 10 items with units in (0, 20]', () => {
    expect(planBodySchema.safeParse(body(0.5)).success).toBe(true);
    expect(planBodySchema.safeParse(body(20, 10)).success).toBe(true);
  });
});
