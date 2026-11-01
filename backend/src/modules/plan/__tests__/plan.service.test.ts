import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import type { Dish, PortionNutrition } from '../../nutrition';
import { createPlanService } from '../plan.service';

const dish = (slug: string, unit: Dish['unit'], gramsPerUnit: number, kcalPer100g: number) =>
  ({ slug, name: slug, unit, gramsPerUnit, kcalPer100g }) as Dish;
const DISHES = [
  dish('roti', 'roti', 40, 275),
  dish('karahi', 'katori', 150, 241),
  dish('raita', 'katori', 100, 100),
];

function setup(remaining: number, catalog: Dish[] = DISHES) {
  const nutrition = {
    getDish: async (slug: string) => catalog.find((d) => d.slug === slug) as Dish,
    listCatalog: async () => catalog,
    portionNutrition: async (slug: string, units: number) => {
      const d = catalog.find((x) => x.slug === slug) as Dish;
      return {
        calories: Math.round((d.kcalPer100g * d.gramsPerUnit * units) / 100),
        proteinG: 1,
        carbsG: 2,
        fatG: 3,
      } as PortionNutrition;
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

  it('lowers the highest-calorie item first until it fits', async () => {
    const plan = await setup(500).buildPlan('u1', REQUEST);
    expect(plan.kind).toBe('reduced');
    expect(unitsOf(plan)).toEqual({ roti: 2, karahi: 0.5 });
    expect(plan.items.map((i) => i.requestedUnits)).toEqual([2, 1]);
    expect(plan.totalCalories).toBe(401);
    expect(plan.isEstimate).toBe(true);
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
        portionNutrition: async () => ({}) as PortionNutrition,
      },
    });
    await expect(service.buildPlan('u1', REQUEST)).rejects.toThrow('Set up your profile first');
  });
});
