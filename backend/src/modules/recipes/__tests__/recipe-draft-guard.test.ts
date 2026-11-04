import { describe, expect, it } from 'vitest';
import { checkRecipeDraft, mergeDrafts } from '../../../../scripts/recipe-draft-guard';

const slugs = new Set(['daal']);
const draft = {
  slug: 'daal-simple',
  title: 'Simple daal',
  dish: 'daal',
  minutes: 30,
  servings: 4,
  ingredients: [
    { item: 'daal', quantity: '1 cup' },
    { item: 'salt', quantity: '1 tsp' },
    { item: 'oil', quantity: '2 tbsp' },
  ],
  steps: ['Boil the daal.', 'Temper with cumin.', 'Serve hot.'],
  reviewed: false,
};
const reason = (d: unknown) => {
  const r = checkRecipeDraft(d, slugs);
  return r.ok ? null : r.reason;
};

describe('checkRecipeDraft', () => {
  it('accepts a valid draft', () => {
    expect(checkRecipeDraft(draft, slugs)).toEqual({ ok: true, recipe: draft });
  });
  it('rejects unknown dish', () => {
    expect(reason({ ...draft, dish: 'pizza' })).toMatch(/dish/);
  });
  it('rejects "healthy"', () => {
    expect(reason({ ...draft, title: 'Healthy daal' })).toMatch(/healthy/i);
  });
  it('rejects 450 kcal', () => {
    expect(reason({ ...draft, steps: ['a', 'b', 'About 450 kcal per bowl'] })).toMatch(/kcal/);
  });
  it('rejects 2 steps', () => {
    expect(reason({ ...draft, steps: ['a', 'b'] })).toMatch(/steps/);
  });
});

describe('mergeDrafts', () => {
  it('keeps existing entries untouched and appends only new slugs', () => {
    const kept = { slug: 'a', reviewed: true };
    expect(mergeDrafts([kept], [{ slug: 'a', reviewed: false }, { slug: 'b', reviewed: false }])).toEqual([
      kept,
      { slug: 'b', reviewed: false },
    ]);
  });
});
