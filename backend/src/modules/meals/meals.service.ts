import { ValidationError } from '../../shared/errors';
import { pktDay, pktDayBounds } from '../../shared/time/pkt';
import type { NutritionService } from '../nutrition';
import type { MealsRepository } from './meals.repository';
import type { Meal, MealItemRow, SaveMealInput } from './meals.types';

interface MealsDeps {
  repository: MealsRepository;
  nutrition: Pick<NutritionService, 'getDish' | 'portionNutrition'>;
  now?: () => Date;
}

// Business rules for meals. Calories come from the catalog for the confirmed items only.
export function createMealsService({ repository, nutrition, now = () => new Date() }: MealsDeps) {
  async function dishId(slug: string | null): Promise<string | null> {
    return slug === null ? null : (await nutrition.getDish(slug)).id;
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

      let totalCalories = 0;
      const rows: Omit<MealItemRow, 'meal_id'>[] = [];
      for (const i of input.items) {
        if (i.confirmedDish !== null && i.confirmedPortion !== null)
          totalCalories += (await nutrition.portionNutrition(i.confirmedDish, i.confirmedPortion))
            .calories;
        rows.push({
          predicted_dish_id: await dishId(i.predictedDish),
          confirmed_dish_id: await dishId(i.confirmedDish),
          predicted_portion: i.predictedPortion,
          confirmed_portion: i.confirmedPortion,
          confidence: i.confidence,
        });
      }

      const { id, eatenAt } = await repository.insertMeal(userId, totalCalories);
      try {
        await repository.insertItems(
          id,
          rows.map((r) => ({ meal_id: id, ...r })),
        );
      } catch (err) {
        // ponytail: supabase-js has no transaction, so undo the meal by hand. Best effort: the original
        // error wins, and an orphan meal with no items can remain if the delete also fails.
        try {
          await repository.deleteMeal(userId, id);
        } catch {
          // ignored on purpose, see above
        }
        throw err;
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
