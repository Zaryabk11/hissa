import type { Db } from '../../shared/db';
import type { CheckinInput, CheckinMeal } from './feel.types';

interface MealRow {
  id: string;
  eaten_at: string;
  meal_items: { confirmed: { name: string } | null }[];
  feel_checkins: { id: string } | null;
}
const SELECT = `id, eaten_at, meal_items(confirmed:dishes!confirmed_dish_id(name)),
  feel_checkins!feel_checkins_meal_id_fkey(id)`;
function toMeal(row: MealRow): CheckinMeal {
  return {
    id: row.id,
    eatenAt: row.eaten_at,
    dishes: [...new Set(row.meal_items.flatMap((i) => (i.confirmed ? [i.confirmed.name] : [])))],
    checkedIn: row.feel_checkins !== null,
  };
}

export function createFeelRepository(db: Db) {
  return {
    async listCandidates(userId: string, start: string, end: string): Promise<CheckinMeal[]> {
      const { data, error } = await db
        .from('meals')
        .select(SELECT)
        .eq('user_id', userId)
        .gte('eaten_at', start)
        .lte('eaten_at', end)
        .order('eaten_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as MealRow[]).map(toMeal);
    },
    async findMeal(userId: string, mealId: string): Promise<CheckinMeal | null> {
      const { data, error } = await db
        .from('meals')
        .select(SELECT)
        .eq('user_id', userId)
        .eq('id', mealId)
        .maybeSingle();
      if (error) throw error;
      return data ? toMeal(data as unknown as MealRow) : null;
    },
    async insertCheckin(
      userId: string,
      input: Omit<CheckinInput, 'symptom'> & { symptom: CheckinInput['symptom'] | null },
    ): Promise<{ id: string }> {
      const { data, error } = await db
        .from('feel_checkins')
        .insert({
          user_id: userId,
          meal_id: input.mealId,
          energy: input.energy,
          stomach: input.stomach,
          symptom: input.symptom,
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id as string };
    },
  };
}
export type FeelRepository = ReturnType<typeof createFeelRepository>;
