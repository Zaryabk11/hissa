import { NotFoundError, ValidationError } from '../../shared/errors';
import type { FeelRepository } from './feel.repository';
import { checkinBodySchema } from './feel.schemas';
import type { GeminiQuestionClient } from './gemini-question.client';
import type { CheckinInput, CheckinMeal, DueCheckin } from './feel.types';
import { isSafeWording, questionBank, type Question } from './question-bank';
import { buildEvidence, GENERIC_ORDER, rankQuestions, useTrainedRanker } from './question-model';
import { questionWeights } from './question-weights';

const MIN_AGE = 90 * 60_000;
const MAX_AGE = 24 * 60 * 60_000;
function eligible(meal: CheckinMeal, now: Date): boolean {
  const age = now.getTime() - Date.parse(meal.eatenAt);
  return !meal.checkedIn && age >= MIN_AGE && age <= MAX_AGE;
}

export function createFeelService({
  repository,
  questionClient,
}: {
  repository: FeelRepository;
  questionClient: GeminiQuestionClient;
}) {
  return {
    // The service owns the intent, options, order and fallback; Gemini only words the question.
    async getQuestion(userId: string, mealId: string, now = new Date()): Promise<Question> {
      const meal = await repository.findMeal(userId, mealId);
      if (!meal) throw new NotFoundError('Meal not found');
      if (!eligible(meal, now) || meal.dishes.length === 0)
        throw new ValidationError('This meal is not due for a check-in.');
      // A check-in made over 24 h after its meal is too late to attribute, so it is not evidence.
      const observations = (await repository.listObservations(userId)).filter(
        (o) => Date.parse(o.checkedInAt) - Date.parse(o.eatenAt) <= MAX_AGE,
      );
      const evidence = buildEvidence(observations);
      const intent =
        (useTrainedRanker ? rankQuestions(evidence, questionWeights) : GENERIC_ORDER)[0] ??
        'symptom_detail';
      const bank = questionBank[intent];
      const fixed: Question = {
        mealId,
        intent,
        text: bank.text,
        options: bank.options.map((o) => ({ ...o })),
        source: 'fallback',
      };
      const allowed = bank.options.map((o) => o.id);
      // Aggregate only: no dish names, ids, meal history or buddy data.
      const c = evidence.candidate;
      const evidenceSummary =
        `${evidence.n} check-ins; ` +
        (c
          ? `one dish repeats across ${c.exposedN} meals with ${c.comparisonN} meals without it`
          : 'no repeated dish yet');
      try {
        const draft = await questionClient.draft({
          intent,
          evidenceSummary,
          allowedOptionIds: allowed,
        });
        // The options always come from the bank. A draft that does not return exactly the allowed
        // ids is not trusted at all, wording included.
        const idsOk =
          draft.optionIds.length === allowed.length &&
          draft.optionIds.every((id) => allowed.includes(id)) &&
          new Set(draft.optionIds).size === allowed.length;
        const text = draft.text.trim();
        if (idsOk && isSafeWording(text, intent)) return { ...fixed, text, source: 'gemini' };
      } catch {
        // Timeout, HTTP error or malformed JSON: the check-in must never be blocked.
      }
      return fixed;
    },
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
