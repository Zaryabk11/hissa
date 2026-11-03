import type { Db } from '../../shared/db';
import type {
  CheckinInput,
  CheckinMeal,
  ExperimentAction,
  ExperimentRow,
  Observation,
} from './feel.types';

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
interface ExperimentDbRow {
  id: string;
  pattern_key: string;
  action: ExperimentAction;
  status: 'active' | 'tried';
  created_at: string;
  tried_at: string | null;
  tried_meal_id: string | null;
}
const EXPERIMENT_COLUMNS = 'id, pattern_key, action, status, created_at, tried_at, tried_meal_id';
const toExperiment = (r: ExperimentDbRow): ExperimentRow => ({
  id: r.id,
  patternKey: r.pattern_key,
  action: r.action,
  status: r.status,
  createdAt: r.created_at,
  triedAt: r.tried_at,
  triedMealId: r.tried_meal_id,
});
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
    // Every experiment query is scoped to user_id: the service role bypasses RLS.
    async insertExperiment(
      userId: string,
      patternKey: string,
      action: ExperimentAction,
    ): Promise<ExperimentRow> {
      const { data, error } = await db
        .from('user_experiments')
        .insert({ user_id: userId, pattern_key: patternKey, action })
        .select(EXPERIMENT_COLUMNS)
        .single();
      if (error) throw error;
      return toExperiment(data as unknown as ExperimentDbRow);
    },
    async findExperiment(userId: string, id: string): Promise<ExperimentRow | null> {
      const { data, error } = await db
        .from('user_experiments')
        .select(EXPERIMENT_COLUMNS)
        .eq('user_id', userId)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? toExperiment(data as unknown as ExperimentDbRow) : null;
    },
    async findCurrentExperiment(userId: string): Promise<ExperimentRow | null> {
      const { data, error } = await db
        .from('user_experiments')
        .select(EXPERIMENT_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? toExperiment(data as unknown as ExperimentDbRow) : null;
    },
    // Only an active row can be marked, so a concurrent second request gets null.
    async markExperimentTried(
      userId: string,
      id: string,
      mealId: string,
      triedAt: string,
    ): Promise<ExperimentRow | null> {
      const { data, error } = await db
        .from('user_experiments')
        .update({ status: 'tried', tried_at: triedAt, tried_meal_id: mealId })
        .eq('user_id', userId)
        .eq('id', id)
        .eq('status', 'active')
        .select(EXPERIMENT_COLUMNS)
        .maybeSingle();
      if (error) throw error;
      return data ? toExperiment(data as unknown as ExperimentDbRow) : null;
    },
    async findMealSavedAt(userId: string, mealId: string): Promise<string | null> {
      const { data, error } = await db
        .from('meals')
        .select('created_at')
        .eq('user_id', userId)
        .eq('id', mealId)
        .maybeSingle();
      if (error) throw error;
      return data ? (data.created_at as string) : null;
    },
    async findCheckinFeeling(
      userId: string,
      mealId: string,
    ): Promise<Pick<CheckinInput, 'energy' | 'stomach'> | null> {
      const { data, error } = await db
        .from('feel_checkins')
        .select('energy, stomach')
        .eq('user_id', userId)
        .eq('meal_id', mealId)
        .maybeSingle();
      if (error) throw error;
      return data as Pick<CheckinInput, 'energy' | 'stomach'> | null;
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
