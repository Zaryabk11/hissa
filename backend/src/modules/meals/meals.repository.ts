import type { Db } from '../../shared/db';
import type { Meal, MealItemRow } from './meals.types';

interface MealRecord {
  id: string;
  eaten_at: string;
  total_calories: number | null;
  meal_items: {
    predicted_portion: number | null;
    confirmed_portion: number | null;
    confidence: number | null;
    predicted: { slug: string } | null;
    confirmed: { slug: string } | null;
  }[];
}

const LIST_SELECT = `id, eaten_at, total_calories,
  meal_items(predicted_portion, confirmed_portion, confidence,
    predicted:dishes!predicted_dish_id(slug), confirmed:dishes!confirmed_dish_id(slug))`;

// Supabase data access for meals. No business rules here.
export function createMealsRepository(db: Db) {
  return {
    async insertMeal(
      userId: string,
      totalCalories: number,
    ): Promise<{ id: string; eatenAt: string }> {
      const { data, error } = await db
        .from('meals')
        .insert({ user_id: userId, total_calories: totalCalories })
        .select('id, eaten_at')
        .single();
      if (error) throw error;
      return { id: data.id as string, eatenAt: data.eaten_at as string };
    },

    async insertItems(_mealId: string, rows: MealItemRow[]): Promise<void> {
      const { error } = await db.from('meal_items').insert(rows);
      if (error) throw error;
    },

    async deleteMeal(userId: string, mealId: string): Promise<void> {
      const { error } = await db.from('meals').delete().eq('id', mealId).eq('user_id', userId);
      if (error) throw error;
    },

    // Items come through their meal, so they are always the user's own.
    async listMealsBetween(userId: string, startIso: string, endIso: string): Promise<Meal[]> {
      const { data, error } = await db
        .from('meals')
        .select(LIST_SELECT)
        .eq('user_id', userId)
        .gte('eaten_at', startIso)
        .lt('eaten_at', endIso)
        .order('eaten_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as MealRecord[]).map((m) => ({
        id: m.id,
        eatenAt: m.eaten_at,
        totalCalories: Number(m.total_calories ?? 0),
        items: m.meal_items.map((i) => ({
          predictedDish: i.predicted?.slug ?? null,
          predictedPortion: i.predicted_portion === null ? null : Number(i.predicted_portion),
          confirmedDish: i.confirmed?.slug ?? null,
          confirmedPortion: i.confirmed_portion === null ? null : Number(i.confirmed_portion),
          confidence: i.confidence === null ? null : Number(i.confidence),
        })),
      }));
    },
  };
}

export type MealsRepository = ReturnType<typeof createMealsRepository>;
