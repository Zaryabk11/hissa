import { describe, expect, it } from 'vitest';
import type { ApiDish, Avoids } from '../core/api';
import { avoidsSummary, filterDishes, toggleDish, toggleProtein } from './avoids-view';

const none: Avoids = { proteins: [], dishes: [] };
const dish = (slug: string, name: string) => ({ slug, name }) as ApiDish;

describe('avoids-view', () => {
  it('toggling twice returns the original', () => {
    expect(toggleProtein(toggleProtein(none, 'beef'), 'beef')).toEqual(none);
    expect(toggleDish(toggleDish(none, 'karela'), 'karela')).toEqual(none);
    expect(toggleProtein(none, 'fish').proteins).toEqual(['fish']);
  });

  it('filters by case-insensitive name and respects the limit', () => {
    const ds = [dish('a', 'Aloo Gobi'), dish('b', 'Aloo Paratha'), dish('c', 'Karela')];
    expect(filterDishes(ds, 'ALOO').map((d) => d.slug)).toEqual(['a', 'b']);
    expect(filterDishes(ds, 'aloo', 1)).toHaveLength(1);
    expect(filterDishes(ds, '  ', 2)).toHaveLength(2);
  });

  it('summarises', () => {
    expect(avoidsSummary(none, (s) => s)).toBe('Nothing yet');
    expect(avoidsSummary({ proteins: ['beef'], dishes: ['karela'] }, (s) => s.toUpperCase())).toBe('Beef, KARELA');
  });
});
