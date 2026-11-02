import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import { portionFromDish, type Dish } from '../../nutrition';
import { createPlanService } from '../plan.service';

const dish = (slug: string, unit: Dish['unit'], gramsPerUnit: number, kcalPer100g: number) =>
  ({
    slug,
    name: slug,
    unit,
    gramsPerUnit,
    kcalPer100g,
    proteinPer100g: 8,
    carbsPer100g: 20,
    fatPer100g: 5,
  }) as Dish;
const DISHES = [
  dish('roti', 'roti', 40, 275),
  dish('karahi', 'katori', 150, 241),
  dish('raita', 'katori', 100, 100),
];

function setup(remaining: number, catalog: Dish[] = DISHES, getDishCalls: string[] = []) {
  const nutrition = {
    getDish: async (slug: string) => {
      getDishCalls.push(slug);
      return catalog.find((d) => d.slug === slug) as Dish;
    },
    listCatalog: async () => catalog,
    portionNutrition: async () => {
      throw new Error('plan must not call portionNutrition');
    },
  };
  const profiles = { getDailyBudget: async () => 2000 };
  const meals = { caloriesToday: async () => 2000 - remaining };
  return createPlanService({ profiles, meals, nutrition });
}

const REQUEST = [
  { slug: 'roti', units: 2 },
  { slug: 'karahi', units: 1 },
];
const unitsOf = (p: { items: { slug: string; units: number }[] }) =>
  Object.fromEntries(p.items.map((i) => [i.slug, i.units]));

describe('plan service', () => {
  it('keeps the requested portions when they fit', async () => {
    const plan = await setup(600).buildPlan('u1', REQUEST);
    expect(plan.kind).toBe('full');
    expect(unitsOf(plan)).toEqual({ roti: 2, karahi: 1 });
    expect(plan.totalCalories).toBe(582);
    expect(plan.remainingBefore).toBe(600);
    expect(plan.remainingAfter).toBe(18);
    expect(plan.isEstimate).toBe(true);
  });

  it('passes the macros through from portionFromDish', async () => {
    const plan = await setup(600).buildPlan('u1', REQUEST);
    plan.items.forEach((item) => {
      const n = portionFromDish(DISHES.find((d) => d.slug === item.slug) as Dish, item.units);
      expect([item.proteinG, item.carbsG, item.fatG]).toEqual([n.proteinG, n.carbsG, n.fatG]);
      expect(Number.isNaN(item.proteinG)).toBe(false);
    });
  });

  it('lowers the highest-calorie item first until it fits', async () => {
    const plan = await setup(500).buildPlan('u1', REQUEST);
    expect(plan.kind).toBe('reduced');
    expect(unitsOf(plan)).toEqual({ roti: 2, karahi: 0.5 });
    expect(plan.items.map((i) => i.requestedUnits)).toEqual([2, 1]);
    expect(plan.totalCalories).toBe(401);
    expect(plan.isEstimate).toBe(true);
  });

  it('rounds lowered units to 2 decimals', async () => {
    const plan = await setup(300).buildPlan('u1', [{ slug: 'karahi', units: 1.1 }]);
    expect(plan.kind).toBe('reduced');
    expect(plan.items[0]?.units).toBe(0.6);
  });

  it('stops at one step per item and reports minimum', async () => {
    const plan = await setup(100).buildPlan('u1', REQUEST);
    expect(plan.kind).toBe('minimum');
    expect(unitsOf(plan)).toEqual({ roti: 1, karahi: 0.5 });
    expect(plan.totalCalories).toBe(291);
    expect(plan.remainingAfter).toBe(-191);
    expect(plan.isEstimate).toBe(true);
  });

  it('is light with suggestions when nothing is left', async () => {
    const plan = await setup(0).buildPlan('u1', REQUEST);
    expect(plan.kind).toBe('light');
    expect(unitsOf(plan)).toEqual({ roti: 1, karahi: 0.5 });
    expect(plan.suggestions.map((s) => [s.slug, s.units])).toEqual([['raita', 0.5]]);
    expect(plan.totalCalories).toBe(291);
    expect(plan.remainingBefore).toBe(0);
    expect(plan.remainingAfter).toBe(-291);
    expect(plan.isEstimate).toBe(true);
  });

  it('does not suggest a dish that is already in the items', async () => {
    const salad = dish('salad', 'plate', 100, 50);
    const plan = await setup(0, [...DISHES, salad]).buildPlan('u1', [{ slug: 'raita', units: 1 }]);
    expect(plan.items.map((i) => i.slug)).toEqual(['raita']);
    expect(plan.suggestions.map((s) => s.slug)).toEqual(['salad']);
  });

  it('never raises a portion above the request in a light plan', async () => {
    const plan = await setup(0).buildPlan('u1', [
      { slug: 'roti', units: 0.5 },
      { slug: 'karahi', units: 0.25 },
    ]);
    expect(unitsOf(plan)).toEqual({ roti: 0.5, karahi: 0.25 });
  });

  it('fetches each requested dish once however many reduction steps run', async () => {
    const calls: string[] = [];
    const plan = await setup(100, DISHES, calls).buildPlan('u1', [
      { slug: 'roti', units: 20 },
      { slug: 'karahi', units: 20 },
    ]);
    expect(plan.kind).toBe('minimum');
    expect(calls).toEqual(['roti', 'karahi']);
  });

  it('lowers the lower index first when two items have equal calories', async () => {
    const catalog = [...DISHES, dish('chapati', 'roti', 40, 275)];
    const forward = await setup(400, catalog).buildPlan('u1', [
      { slug: 'chapati', units: 2 },
      { slug: 'roti', units: 2 },
    ]);
    expect(forward.items.map((i) => i.units)).toEqual([1, 2]);
    const backward = await setup(400, catalog).buildPlan('u1', [
      { slug: 'roti', units: 2 },
      { slug: 'chapati', units: 2 },
    ]);
    expect(backward.items.map((i) => i.units)).toEqual([1, 2]);
  });

  it('treats duplicate slugs as separate items', async () => {
    const plan = await setup(400).buildPlan('u1', [
      { slug: 'roti', units: 2 },
      { slug: 'roti', units: 2 },
    ]);
    expect(plan.kind).toBe('reduced');
    expect(plan.items.map((i) => [i.slug, i.requestedUnits, i.units])).toEqual([
      ['roti', 2, 1],
      ['roti', 2, 2],
    ]);
  });

  it.each([
    ['piece', 1],
    ['glass', 1],
    ['bowl', 0.5],
    ['plate', 0.5],
  ] as const)('lowers a %s item by its step of %s', async (unit, step) => {
    const catalog = [dish('thing', unit, 100, 100)]; // 100 kcal per unit
    const plan = await setup(250, catalog).buildPlan('u1', [{ slug: 'thing', units: 3 }]);
    expect(plan.kind).toBe('reduced');
    expect(plan.items[0]?.units).toBe(3 - step);
  });

  it('propagates the missing-profile error', async () => {
    const service = createPlanService({
      profiles: {
        getDailyBudget: async () => {
          throw new NotFoundError('Set up your profile first');
        },
      },
      meals: { caloriesToday: async () => 0 },
      nutrition: {
        getDish: async () => DISHES[0] as Dish,
        listCatalog: async () => DISHES,
      },
    });
    await expect(service.buildPlan('u1', REQUEST)).rejects.toThrow('Set up your profile first');
  });
});
