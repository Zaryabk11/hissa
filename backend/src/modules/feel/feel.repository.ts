import type { Db } from '../../shared/db';
import type { CheckinInput, CheckinMeal, Observation } from './feel.types';

interface ObservationRow {
  id: string;
  eaten_at: string;
  meal_items: { confirmed: { slug: string; category: string } | null }[];
  feel_checkins: {
    energy: Observation['energy'];
    stomach: Observation['stomach'];
    symptom: Observation['symptom'];
    answer_id: string | null;
    created_at: string;
  };
}

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
    // Owner's checked-in meals with confirmed dishes; the service decides which count as evidence.
    // ponytail: reads the whole history per call, add a window/limit if per-user meals grow large.
    async listObservations(userId: string): Promise<Observation[]> {
      const { data, error } = await db
        .from('meals')
        .select(
          `id, eaten_at, meal_items(confirmed:dishes!confirmed_dish_id(slug, category)),
          feel_checkins!feel_checkins_meal_id_fkey!inner(energy, stomach, symptom, answer_id, created_at)`,
        )
        .eq('user_id', userId)
        .order('eaten_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as ObservationRow[])
        .map((r) => {
          const dishes = new Map(
            r.meal_items.flatMap((i) =>
              i.confirmed ? [[i.confirmed.slug, i.confirmed] as const] : [],
            ),
          );
          return {
            userId,
            mealId: r.id,
            eatenAt: r.eaten_at,
            checkedInAt: r.feel_checkins.created_at,
            dishes: [...dishes.values()],
            energy: r.feel_checkins.energy,
            stomach: r.feel_checkins.stomach,
            symptom: r.feel_checkins.symptom,
            answerId: r.feel_checkins.answer_id,
          };
        })
        .filter((o) => o.dishes.length > 0);
    },
  };
}
export type FeelRepository = ReturnType<typeof createFeelRepository>;
