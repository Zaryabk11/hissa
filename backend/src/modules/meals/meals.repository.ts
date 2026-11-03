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

function toMeal(m: MealRecord): Meal {
  return {
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
  };
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

    async insertItems(rows: MealItemRow[]): Promise<void> {
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
      return (data as unknown as MealRecord[]).map(toMeal);
    },

    async getMeal(userId: string, mealId: string): Promise<Meal | null> {
      const { data, error } = await db
        .from('meals')
        .select(LIST_SELECT)
        .eq('id', mealId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? toMeal(data as unknown as MealRecord) : null;
    },

    // One database transaction (migration 20261103000100): a failed edit keeps the old items.
    // False when the meal is not the user's.
    async replaceItems(
      userId: string,
      mealId: string,
      totalCalories: number,
      items: Omit<MealItemRow, 'meal_id'>[],
    ): Promise<boolean> {
      const { data, error } = await db.rpc('meal_replace_items', {
        actor_id: userId,
        target_meal_id: mealId,
        new_total: totalCalories,
        new_items: items,
      });
      if (error) throw error;
      return data === true;
    },

    // One database transaction: the meal, its items, check-ins and (if it was the last meal of its
    // PKT day) the streak day go together or not at all. False when the meal is not the user's.
    async removeMeal(userId: string, mealId: string): Promise<boolean> {
      const { data, error } = await db.rpc('meal_delete', {
        actor_id: userId,
        target_meal_id: mealId,
      });
      if (error) throw error;
      return data === true;
    },
  };
}

export type MealsRepository = ReturnType<typeof createMealsRepository>;
