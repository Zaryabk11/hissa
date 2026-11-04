import { NotFoundError } from '../../shared/errors';
import type { MealsService } from '../meals';
import { portionFromDish, type Dish, type NutritionService } from '../nutrition';
import { isAvoided, type ProfilesService } from '../profiles';
import { rank } from './rank';
import type { RecipesRepository } from './recipes.repository';
import type { PatternSource, RecipeCard, RecipeDetail, RecipeRow } from './recipes.types';

interface RecipesDeps {
  repository: RecipesRepository;
  profiles: Pick<ProfilesService, 'getAvoids' | 'getDailyBudget'>;
  meals: Pick<MealsService, 'caloriesToday' | 'dishCounts'>;
  feel: PatternSource;
  nutrition: Pick<NutritionService, 'listCatalog'>;
}

// Business rules for recipes: serve reviewed recipes, ranked for the user's budget, avoids and habits.
export function createRecipesService({
  repository,
  profiles,
  meals,
  feel,
  nutrition,
}: RecipesDeps) {
  async function catalog(): Promise<Map<string, Dish>> {
    return new Map((await nutrition.listCatalog()).map((d) => [d.slug, d]));
  }

  function toCard(row: RecipeRow, dishes: Map<string, Dish>): RecipeCard {
    const dish = dishes.get(row.dishes.slug);
    if (!dish) throw new NotFoundError('Recipe not found');
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      dish: dish.slug,
      dishName: dish.name,
      proteinType: dish.proteinType,
      minutes: row.minutes,
      servings: row.servings,
      unit: dish.unit,
      kcalPerUnit: portionFromDish(dish, 1).calories,
      isEstimate: true,
    };
  }

  async function findOrThrow(id: string): Promise<RecipeRow> {
    const row = await repository.findReviewed(id);
    if (!row) throw new NotFoundError('Recipe not found');
    return row;
  }

  return {
    async list(userId: string) {
      // Throws NotFoundError("Set up your profile first") before anything else is read.
      const budget = await profiles.getDailyBudget(userId);
      const [avoids, eaten, counts, pattern, rows, rejectedIds, dishes] = await Promise.all([
        profiles.getAvoids(userId),
        meals.caloriesToday(userId),
        meals.dishCounts(userId),
        feel.getWeeklyPattern(userId),
        repository.listReviewed(),
        repository.listNotForMe(userId),
        catalog(),
      ]);
      const heavy = { dishes: new Set<string>(), categories: new Set<string>() };
      if (pattern.state === 'pattern' && pattern.pattern?.outcome === 'heavy')
        heavy[pattern.pattern.kind === 'dish' ? 'dishes' : 'categories'].add(
          pattern.pattern.subject,
        );
      const remaining = budget - eaten;
      return {
        recipes: rank({
          recipes: rows.map((r) => toCard(r, dishes)),
          avoids,
          notForMe: new Set(rejectedIds),
          remaining,
          counts,
          heavy,
          categoryOf: Object.fromEntries([...dishes.values()].map((d) => [d.slug, d.category])),
        }),
        remainingCalories: remaining,
        isEstimate: true as const,
      };
    },

    async detail(userId: string, id: string): Promise<RecipeDetail> {
      const row = await findOrThrow(id);
      const [avoids, rejectedIds, dishes] = await Promise.all([
        profiles.getAvoids(userId),
        repository.listNotForMe(userId),
        catalog(),
      ]);
      const card = toCard(row, dishes);
      return {
        ...card,
        ingredients: row.ingredients,
        steps: row.steps,
        notForMe: rejectedIds.includes(id),
        avoided: isAvoided(avoids, { slug: card.dish, proteinType: card.proteinType }),
      };
    },

    async markNotForMe(userId: string, id: string): Promise<void> {
      await findOrThrow(id);
      await repository.addNotForMe(userId, id);
    },

    async undoNotForMe(userId: string, id: string): Promise<void> {
      await repository.removeNotForMe(userId, id);
    },
  };
}

export type RecipesService = ReturnType<typeof createRecipesService>;
