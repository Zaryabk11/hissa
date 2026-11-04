import { describe, expect, it } from 'vitest';
import { rank, type RankInput } from '../rank';
import type { RecipeCard } from '../recipes.types';

const card = (id: string, patch: Partial<RecipeCard> = {}): RecipeCard => ({
  id,
  slug: id,
  title: id,
  dish: id,
  dishName: id,
  proteinType: null,
  minutes: 20,
  servings: 2,
  unit: 'katori',
  kcalPerUnit: 100,
  isEstimate: true,
  ...patch,
});
const input = (recipes: RecipeCard[], patch: Partial<RankInput> = {}): RankInput => ({
  recipes,
  avoids: { proteins: [], dishes: [] },
  notForMe: new Set(),
  remaining: 500,
  counts: {},
  heavy: { dishes: new Set(), categories: new Set() },
  categoryOf: {},
  ...patch,
});
const ids = (rs: RecipeCard[]) => rs.map((r) => r.id);

describe('rank', () => {
  it('rank drops protein-avoided and keeps null-protein', () => {
    const out = rank(
      input([card('beef-pulao', { proteinType: 'beef' }), card('raita')], {
        avoids: { proteins: ['beef'], dishes: [] },
      }),
    );
    expect(ids(out)).toEqual(['raita']);
  });
  it('drops a dish-avoided recipe', () => {
    const out = rank(
      input([card('haleem'), card('raita')], { avoids: { proteins: [], dishes: ['haleem'] } }),
    );
    expect(ids(out)).toEqual(['raita']);
  });
  it('over budget still returns, cheapest first', () => {
    const out = rank(
      input([card('b', { kcalPerUnit: 300 }), card('a', { kcalPerUnit: 200 })], { remaining: -50 }),
    );
    expect(ids(out)).toEqual(['a', 'b']);
  });
  it('recipes that fit the remaining calories come first', () => {
    const out = rank(
      input([card('big', { kcalPerUnit: 600 }), card('small', { kcalPerUnit: 300 })]),
    );
    expect(ids(out)).toEqual(['small', 'big']);
  });
  it('not-for-me recipe dropped and same-protein penalised', () => {
    const out = rank(
      input(
        [
          card('x', { proteinType: 'chicken' }),
          card('chicken-b', { proteinType: 'chicken', kcalPerUnit: 50 }),
          card('veg-c', { proteinType: 'veg', kcalPerUnit: 90 }),
        ],
        { notForMe: new Set(['x']) },
      ),
    );
    expect(ids(out)).toEqual(['veg-c', 'chicken-b']);
  });
  it('heavy dish demoted', () => {
    const out = rank(
      input([card('a', { kcalPerUnit: 50 }), card('b')], {
        heavy: { dishes: new Set(['a']), categories: new Set() },
      }),
    );
    expect(ids(out)).toEqual(['b', 'a']);
  });
  it('heavy category demoted', () => {
    const out = rank(
      input([card('a', { kcalPerUnit: 50 }), card('b')], {
        heavy: { dishes: new Set(), categories: new Set(['fried']) },
        categoryOf: { a: 'fried', b: 'lentil' },
      }),
    );
    expect(ids(out)).toEqual(['b', 'a']);
  });
  it('often-eaten boosted', () => {
    const out = rank(
      input([card('a', { kcalPerUnit: 50 }), card('b')], { counts: { b: 2, a: 1 } }),
    );
    expect(ids(out)).toEqual(['b', 'a']);
  });
  it('stable order by title', () => {
    expect(ids(rank(input([card('b'), card('a'), card('c')])))).toEqual(['a', 'b', 'c']);
  });
  it('takes 20', () => {
    const many = Array.from({ length: 25 }, (_, i) => card(`r${String(i).padStart(2, '0')}`));
    expect(rank(input(many))).toHaveLength(20);
  });
});
