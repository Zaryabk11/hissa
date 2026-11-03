import { logger } from '../../shared/logger';
import { NotFoundError, ValidationError } from '../../shared/errors';
import type { FeelRepository } from './feel.repository';
import { checkinBodySchema } from './feel.schemas';
import type { GeminiQuestionClient } from './gemini-question.client';
import type { CheckinInput, CheckinMeal, DueCheckin } from './feel.types';
import { isSafeWording, questionBank, type Question } from './question-bank';
import { buildEvidence } from './question-model';

const MIN_AGE = 90 * 60_000;
const MAX_AGE = 24 * 60 * 60_000;

// ponytail: per-process memory, so each API instance calls Gemini at most once per user and meal
// per 10 minutes. Move to a shared store (or a column on the meal) if the API is scaled out.
const CACHE_TTL = 10 * 60_000;
const CACHE_MAX = 500;

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
  const cache = new Map<string, { question: Question; expires: number }>();
  return {
    // The service owns the intent, options, order and fallback; Gemini only words the question.
    // Only symptom_detail is served for now: a pre_existing answer has nowhere to be stored yet, so
    // the ranker (rankQuestions) is deliberately not consulted.
    async getQuestion(userId: string, mealId: string, now = new Date()): Promise<Question> {
      const meal = await repository.findMeal(userId, mealId);
      if (!meal) throw new NotFoundError('Meal not found');
      if (!eligible(meal, now) || meal.dishes.length === 0)
        throw new ValidationError('This meal is not due for a check-in.');
      const key = `${userId}:${mealId}`;
      const hit = cache.get(key);
      if (hit && hit.expires > now.getTime()) return hit.question;

      const intent = 'symptom_detail';
      const bank = questionBank[intent];
      const fixed: Question = {
        mealId,
        intent,
        text: bank.text,
        options: bank.options.map((o) => ({ ...o })),
        source: 'fallback',
      };
      let observations;
      try {
        // A check-in made over 24 h after its meal is too late to attribute, so it is not evidence.
        observations = (await repository.listObservations(userId)).filter(
          (o) => Date.parse(o.checkedInAt) - Date.parse(o.eatenAt) <= MAX_AGE,
        );
      } catch (err) {
        // The check-in must never be blocked. Not cached, so the next request tries again.
        logger.warn('Question history unavailable', {
          error: err instanceof Error ? err.name : 'UnknownError',
        });
        return fixed;
      }
      const evidence = buildEvidence(observations);
      const allowed = bank.options.map((o) => o.id);
      // Aggregate only: no dish names, ids, meal history or buddy data.
      const c = evidence.candidate;
      const evidenceSummary =
        `${evidence.n} check-ins; ` +
        (c
          ? `one dish repeats across ${c.exposedN} meals with ${c.comparisonN} meals without it`
          : 'no repeated dish yet');
      let question = fixed;
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
        if (idsOk && isSafeWording(text)) question = { ...fixed, text, source: 'gemini' };
      } catch {
        // Timeout, HTTP error or malformed JSON: the check-in must never be blocked.
      }
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(key, { question, expires: now.getTime() + CACHE_TTL });
      return question;
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
