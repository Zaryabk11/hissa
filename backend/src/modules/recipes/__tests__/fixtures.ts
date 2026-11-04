import type { Dish } from '../../nutrition';
import type { RecipeRow } from '../recipes.types';

export const dish = (slug: string, patch: Partial<Dish> = {}): Dish => ({
  id: `id-${slug}`,
  slug,
  name: slug,
  category: 'lentil',
  unit: 'katori',
  gramsPerUnit: 100,
  kcalPer100g: 150,
  proteinPer100g: 5,
  carbsPer100g: 20,
  fatPer100g: 5,
  source: 'khan2019',
  basis: 'lab',
  unitBasis: 'derived',
  proteinType: null,
  ...patch,
});
export const row = (id: string, dishSlug: string): RecipeRow => ({
  id,
  slug: id,
  title: id,
  minutes: 30,
  servings: 4,
  ingredients: [{ item: 'salt', quantity: '1 tsp' }],
  steps: ['Cook.'],
  dishes: { slug: dishSlug },
});
