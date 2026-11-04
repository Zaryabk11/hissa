import { NotFoundError, ValidationError } from '../../shared/errors';
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

const DAY_MS = 24 * 60 * 60 * 1000;

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

  // Resolve every slug (and price every confirmed item) before any write, in parallel. Totals always
  // come from the catalog, never from the client.
  async function priceItems(
    input: SaveMealInput,
  ): Promise<{ rows: Omit<MealItemRow, 'meal_id'>[]; totalCalories: number }> {
    if (!input.items.some((i) => i.confirmedDish !== null))
      throw new ValidationError('A meal needs at least one confirmed dish');
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
    return {
      rows: resolved.map((r) => r.row),
      totalCalories: resolved.reduce((sum, r) => sum + r.calories, 0),
    };
  }

  // The last `count` PKT days ending today, oldest first.
  function lastDays(count: number): string[] {
    const t = now().getTime();
    return Array.from({ length: count }, (_, i) => pktDay(new Date(t - (count - 1 - i) * DAY_MS)));
  }

  async function mealsOver(userId: string, days: string[]): Promise<Meal[]> {
    const first = days[0] as string;
    const last = days[days.length - 1] as string;
    return repository.listMealsBetween(
      userId,
      pktDayBounds(first).startIso,
      pktDayBounds(last).endIso,
    );
  }

  async function listToday(userId: string) {
    const day = pktDay(now());
    const { startIso, endIso } = pktDayBounds(day);
    const meals = await repository.listMealsBetween(userId, startIso, endIso);
    return { day, meals, totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0) };
  }

  return {
    async saveMeal(userId: string, input: SaveMealInput): Promise<Meal> {
      const { rows, totalCalories } = await priceItems(input);

      const { id, eatenAt } = await repository.insertMeal(userId, totalCalories);
      try {
        await repository.insertItems(rows.map((row) => ({ meal_id: id, ...row })));
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

    // Last 7 PKT days, oldest first, days without meals as 0/0. Totals are estimates.
    async weekTotals(userId: string) {
      const days = lastDays(7);
      const byDay = new Map(days.map((day) => [day, { day, totalCalories: 0, mealCount: 0 }]));
      for (const m of await mealsOver(userId, days)) {
        const d = byDay.get(pktDay(new Date(m.eatenAt)));
        if (d) {
          d.totalCalories += m.totalCalories;
          d.mealCount += 1;
        }
      }
      return { days: [...byDay.values()] };
    },

    // Newest day first, only days with meals; meals stay oldest first within a day, as in listToday.
    async history(userId: string, count = 14) {
      const days = lastDays(count);
      const byDay = new Map<string, Meal[]>();
      for (const m of await mealsOver(userId, days)) {
        const day = pktDay(new Date(m.eatenAt));
        byDay.set(day, [...(byDay.get(day) ?? []), m]);
      }
      return {
        days: days
          .reverse()
          .filter((day) => byDay.has(day))
          .map((day) => {
            const meals = byDay.get(day) as Meal[];
            return {
              day,
              totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
              meals,
            };
          }),
      };
    },

    // Confirmed dish slugs only, counted per item over the last `days` days.
    async dishCounts(userId: string, days = 30): Promise<Record<string, number>> {
      const counts: Record<string, number> = {};
      for (const day of (await this.history(userId, days)).days)
        for (const meal of day.meals)
          for (const { confirmedDish } of meal.items)
            if (confirmedDish) counts[confirmedDish] = (counts[confirmedDish] ?? 0) + 1;
      return counts;
    },

    async getMeal(userId: string, mealId: string): Promise<Meal> {
      const meal = await repository.getMeal(userId, mealId);
      if (!meal) throw new NotFoundError('Meal not found');
      return meal;
    },

    // Replaces the items; eatenAt, and so the PKT day and streak, never change.
    async updateMeal(userId: string, mealId: string, input: SaveMealInput): Promise<Meal> {
      const { rows, totalCalories } = await priceItems(input);
      if (!(await repository.replaceItems(userId, mealId, totalCalories, rows)))
        throw new NotFoundError('Meal not found');
      return this.getMeal(userId, mealId);
    },

    async deleteMeal(userId: string, mealId: string): Promise<void> {
      if (!(await repository.removeMeal(userId, mealId))) throw new NotFoundError('Meal not found');
    },

    async caloriesToday(userId: string): Promise<number> {
      return (await listToday(userId)).totalCalories;
    },
  };
}

export type MealsService = ReturnType<typeof createMealsService>;
