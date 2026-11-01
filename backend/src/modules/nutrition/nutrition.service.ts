import { NotFoundError, ValidationError } from '../../shared/errors';
import type { NutritionRepository } from './nutrition.repository';
import type { Dish, PortionNutrition } from './nutrition.types';

interface NutritionDeps {
  repository: NutritionRepository;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Pure per-portion maths for an already-fetched dish (also used by plan, one fetch per dish).
export function portionFromDish(dish: Dish, units: number): PortionNutrition {
  if (!Number.isFinite(units) || units <= 0)
    throw new ValidationError('units must be greater than 0');
  const grams = dish.gramsPerUnit * units;
  const per = (per100g: number) => (per100g * grams) / 100;
  return {
    slug: dish.slug,
    units,
    grams: round1(grams),
    calories: Math.round(per(dish.kcalPer100g)),
    proteinG: round1(per(dish.proteinPer100g)),
    carbsG: round1(per(dish.carbsPer100g)),
    fatG: round1(per(dish.fatPer100g)),
    source: dish.source,
    basis: dish.basis,
    unitBasis: dish.unitBasis,
    isEstimate: true,
  };
}

// Business rules for nutrition. Numbers come from the catalog, never from Gemini.
export function createNutritionService({ repository }: NutritionDeps) {
  async function getDish(slug: string): Promise<Dish> {
    const dish = await repository.findDishBySlug(slug);
    if (!dish) throw new NotFoundError(`Unknown dish: ${slug}`);
    return dish;
  }

  return {
    listCatalog: () => repository.listDishes(),

    getDish,

    async portionNutrition(slug: string, units: number): Promise<PortionNutrition> {
      return portionFromDish(await getDish(slug), units);
    },
  };
}

export type NutritionService = ReturnType<typeof createNutritionService>;
