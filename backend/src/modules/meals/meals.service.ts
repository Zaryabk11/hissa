import { ValidationError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { pktDay, pktDayBounds } from '../../shared/time/pkt';
import type { StreaksService } from '../streaks';
import type { NutritionService } from '../nutrition';
import type { MealsRepository } from './meals.repository';
import type { Meal, MealItemRow, SaveMealInput } from './meals.types';

interface MealsDeps {
  repository: MealsRepository;
  nutrition: Pick<NutritionService, 'getDish' | 'portionNutrition'>;
  streaks: Pick<StreaksService, 'markMealSaved'>;
  now?: () => Date;
}

// Business rules for meals. A predicted dish of "unknown" (what a scan emits) counts as no dish.
// Calories come from the catalog for the confirmed items only.
export function createMealsService({
  repository,
  nutrition,
  streaks,
  now = () => new Date(),
}: MealsDeps) {
  async function dishId(slug: string | null): Promise<string | null> {
    return slug === null || slug === 'unknown' ? null : (await nutrition.getDish(slug)).id;
  }

  async function listToday(userId: string) {
    const day = pktDay(now());
    const { startIso, endIso } = pktDayBounds(day);
    const meals = await repository.listMealsBetween(userId, startIso, endIso);
    return { day, meals, totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0) };
  }

  return {
    async saveMeal(userId: string, input: SaveMealInput): Promise<Meal> {
      if (!input.items.some((i) => i.confirmedDish !== null))
        throw new ValidationError('A meal needs at least one confirmed dish');

      // Resolve every slug (and price every confirmed item) before any insert, in parallel.
      const resolved = await Promise.all(
        input.items.map(async (i) => {
          const [calories, predictedId, confirmedId] = await Promise.all([
            i.confirmedDish !== null && i.confirmedPortion !== null
              ? nutrition
                  .portionNutrition(i.confirmedDish, i.confirmedPortion)
                  .then((n) => n.calories)
              : 0,
            dishId(i.predictedDish),
            dishId(i.confirmedDish),
          ]);
          const row: Omit<MealItemRow, 'meal_id'> = {
            predicted_dish_id: predictedId,
            confirmed_dish_id: confirmedId,
            predicted_portion: i.predictedPortion,
            confirmed_portion: i.confirmedPortion,
            confidence: i.confidence,
          };
          return { calories, row };
        }),
      );
      const totalCalories = resolved.reduce((sum, r) => sum + r.calories, 0);

      const { id, eatenAt } = await repository.insertMeal(userId, totalCalories);
      try {
        await repository.insertItems(resolved.map((r) => ({ meal_id: id, ...r.row })));
      } catch (err) {
        // ponytail: supabase-js has no transaction, so undo the meal by hand. Best effort: the original
        // error wins, and an orphan meal with no items can remain if the delete also fails (logged).
        try {
          await repository.deleteMeal(userId, id);
        } catch {
          logger.warn('Compensating meal delete failed', { mealId: id });
        }
        throw err;
      }
      try {
        await streaks.markMealSaved(userId, eatenAt);
      } catch {
        // A status read repairs from complete saved meals; do not encourage duplicate saves.
        logger.warn('Saved meal streak mark failed', { mealId: id });
      }
      return { id, eatenAt, totalCalories, items: input.items };
    },

    listToday,

    async caloriesToday(userId: string): Promise<number> {
      return (await listToday(userId)).totalCalories;
    },
  };
}

export type MealsService = ReturnType<typeof createMealsService>;
