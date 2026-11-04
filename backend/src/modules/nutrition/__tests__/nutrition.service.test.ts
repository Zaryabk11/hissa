import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../../shared/errors';
import type { NutritionRepository } from '../nutrition.repository';
import { createNutritionService, portionFromDish } from '../nutrition.service';
import type { Dish } from '../nutrition.types';

const karahi: Dish = {
  id: 'dish-1',
  slug: 'chicken-karahi',
  name: 'Chicken karahi',
  category: 'curry',
  unit: 'katori',
  gramsPerUnit: 150,
  kcalPer100g: 241,
  proteinPer100g: 17,
  carbsPer100g: 4,
  fatPer100g: 18,
  source: 'farooq2026',
  basis: 'lab',
  unitBasis: 'assumed',
  proteinType: null,
};

const repository: NutritionRepository = {
  listDishes: async () => [karahi],
  findDishBySlug: async (slug) => (slug === karahi.slug ? karahi : null),
};

const service = createNutritionService({ repository });

describe('nutrition service', () => {
  it('computes per-portion nutrition as an estimate', async () => {
    expect(await service.portionNutrition('chicken-karahi', 1.5)).toEqual({
      slug: 'chicken-karahi',
      units: 1.5,
      grams: 225,
      calories: 542,
      proteinG: 38.3,
      carbsG: 9,
      fatG: 40.5,
      source: 'farooq2026',
      basis: 'lab',
      unitBasis: 'assumed',
      isEstimate: true,
    });
  });

  it('rejects an unknown dish', async () => {
    await expect(service.portionNutrition('nope', 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects units that are not positive', async () => {
    await expect(service.portionNutrition('chicken-karahi', 0)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects negative units', async () => {
    await expect(service.portionNutrition('chicken-karahi', -1)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('reports the catalog slug, not the one the caller passed', async () => {
    const lenient = createNutritionService({
      repository: { ...repository, findDishBySlug: async () => karahi },
    });
    expect((await lenient.portionNutrition('Chicken-Karahi', 1)).slug).toBe('chicken-karahi');
  });

  it('rejects non-finite units', async () => {
    for (const units of [Infinity, NaN]) {
      await expect(service.portionNutrition('chicken-karahi', units)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(() => portionFromDish(karahi, units)).toThrow(ValidationError);
    }
  });

  it('computes a portion from a dish without a lookup', () => {
    expect(portionFromDish(karahi, 1.5).calories).toBe(542);
  });

  it('lists the catalog', async () => {
    expect(await service.listCatalog()).toEqual([karahi]);
  });
});
