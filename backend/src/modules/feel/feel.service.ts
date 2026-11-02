import { NotFoundError, ValidationError } from '../../shared/errors';
import type { FeelRepository } from './feel.repository';
import { checkinBodySchema } from './feel.schemas';
import type { CheckinInput, CheckinMeal, DueCheckin } from './feel.types';

const MIN_AGE = 90 * 60_000;
const MAX_AGE = 24 * 60 * 60_000;
function eligible(meal: CheckinMeal, now: Date): boolean {
  const age = now.getTime() - Date.parse(meal.eatenAt);
  return !meal.checkedIn && age >= MIN_AGE && age <= MAX_AGE;
}

export function createFeelService({ repository }: { repository: FeelRepository }) {
  return {
    async getDue(
      userId: string,
      now = new Date(),
      skip: string[] = [],
    ): Promise<DueCheckin | null> {
      const meals = await repository.listCandidates(
        userId,
        new Date(now.getTime() - MAX_AGE).toISOString(),
        new Date(now.getTime() - MIN_AGE).toISOString(),
      );
      const meal = meals
        .filter((m) => m.dishes.length > 0 && !skip.includes(m.id) && eligible(m, now))
        .sort((a, b) => Date.parse(a.eatenAt) - Date.parse(b.eatenAt))[0];
      return meal ? { mealId: meal.id, eatenAt: meal.eatenAt, dishes: meal.dishes } : null;
    },
    async submitCheckin(
      userId: string,
      input: CheckinInput,
      now = new Date(),
    ): Promise<{ id: string }> {
      const parsed = checkinBodySchema.safeParse(input);
      if (!parsed.success) throw new ValidationError('Choose an allowed check-in answer.');
      const meal = await repository.findMeal(userId, parsed.data.mealId);
      if (!meal) throw new NotFoundError('Meal not found');
      if (!eligible(meal, now)) throw new ValidationError('This meal is not due for a check-in.');
      try {
        return await repository.insertCheckin(userId, {
          ...parsed.data,
          symptom: parsed.data.symptom ?? null,
        });
      } catch (error) {
        // unique(meal_id): another request already answered this meal.
        if ((error as { code?: string }).code === '23505')
          throw new ValidationError('This meal already has a check-in.');
        throw error;
      }
    },
  };
}
export type FeelService = ReturnType<typeof createFeelService>;
