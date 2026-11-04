import { describe, expect, it } from 'vitest';
import { cardLine, columnsFor, restore, withoutRecipe } from './recipes-view';
import type { RecipeCard } from './api/recipes';

const r = (id: string): RecipeCard => ({
  id, slug: id, title: id, dish: 'daal', dishName: 'Daal', proteinType: null,
  minutes: 25, servings: 2, unit: 'katori', kcalPerUnit: 320, isEstimate: true,
});

describe('recipes view', () => {
  it('labels the line as an estimate', () => {
    expect(cardLine(r('a'))).toBe('25 min · about 320 kcal per katori (estimate)');
  });
  it('uses two columns from 900', () => {
    expect(columnsFor(899)).toBe(1);
    expect(columnsFor(900)).toBe(2);
  });
  it('removes and restores in the same order', () => {
    const list = [r('a'), r('b'), r('c')];
    const next = withoutRecipe(list, 'b');
    expect(next.map((x) => x.id)).toEqual(['a', 'c']);
    expect(restore(next, list[1], 1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
