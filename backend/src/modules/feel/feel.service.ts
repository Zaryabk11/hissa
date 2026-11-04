import { logger } from '../../shared/logger';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import type { FeelRepository } from './feel.repository';
import { checkinBodySchema } from './feel.schemas';
import type { GeminiQuestionClient } from './gemini-question.client';
import type {
  CheckinInput,
  CheckinMeal,
  DueCheckin,
  Experiment,
  ExperimentAction,
  ExperimentRow,
  Observation,
} from './feel.types';
import { isSafeWording, questionBank, type Question } from './question-bank';
import { buildEvidence } from './question-model';
import { weeklyPattern, type PatternCard } from './weekly-pattern';

const MIN_AGE = 90 * 60_000;
const MAX_AGE = 24 * 60 * 60_000;
// The pre_existing follow-up is asked at most once per user per 14 days.
const PRE_EXISTING_GAP = 14 * MAX_AGE;

// ponytail: per-process memory, so each API instance calls Gemini at most once per user and meal
// per 10 minutes. Move to a shared store (or a column on the meal) if the API is scaled out.
const CACHE_TTL = 10 * 60_000;
const CACHE_MAX = 500;

// The caller's own check-ins only; one made over 24 h after its meal is too late to attribute.
// A meal the user said they already felt unwell before (pre_existing=yes) is not evidence for its
// dishes, in both the weekly card and the per-user model. no and not_sure change nothing.
function attributable(rows: Observation[], userId: string): Observation[] {
  return rows.filter(
    (o) =>
      o.userId === userId &&
      Date.parse(o.checkedInAt) - Date.parse(o.eatenAt) <= MAX_AGE &&
      !(o.questionType === 'pre_existing' && o.answerId === 'yes'),
  );
}

function eligible(meal: CheckinMeal, now: Date): boolean {
  const age = now.getTime() - Date.parse(meal.eatenAt);
  return !meal.checkedIn && age >= MIN_AGE && age <= MAX_AGE;
}

export function createFeelService({
  repository,
  questionClient,
  demoUserId,
}: {
  repository: FeelRepository;
  questionClient: GeminiQuestionClient;
  // Optional demo-only account: the one user whose weekly card is labelled sample data.
  demoUserId?: string;
}) {
  // The experiment plus, once tried, how the owner's own check-in for that meal looked.
  async function present(userId: string, row: ExperimentRow): Promise<Experiment> {
    const feeling = row.triedMealId
      ? await repository.findCheckinFeeling(userId, row.triedMealId)
      : null;
    return {
      id: row.id,
      patternKey: row.patternKey,
      action: row.action,
      status: row.status,
      createdAt: row.createdAt,
      triedAt: row.triedAt,
      tried: row.triedMealId
        ? {
            mealId: row.triedMealId,
            energy: feeling?.energy ?? null,
            stomach: feeling?.stomach ?? null,
          }
        : null,
    };
  }
  const cache = new Map<string, { question: Question; expires: number }>();
  return {
    // The service owns the intent, options, order and fallback; Gemini only words the question.
    // symptom_detail is the default. pre_existing is served only as the step after it (`followUp`:
    // the caller has a heavy stomach and has answered the symptom step), at most once per 14 days,
    // with the fixed bank wording. The ranker (rankQuestions) is deliberately not consulted.
    async getQuestion(
      userId: string,
      mealId: string,
      now = new Date(),
      followUp = false,
    ): Promise<Question> {
      const meal = await repository.findMeal(userId, mealId);
      if (!meal) throw new NotFoundError('Meal not found');
      if (!eligible(meal, now) || meal.dishes.length === 0)
        throw new ValidationError('This meal is not due for a check-in.');
      if (followUp) {
        try {
          const last = await repository.findLastPreExistingAt(userId);
          if (last === null || now.getTime() - Date.parse(last) >= PRE_EXISTING_GAP)
            return {
              mealId,
              intent: 'pre_existing',
              text: questionBank.pre_existing.text,
              options: questionBank.pre_existing.options.map((o) => ({ ...o })),
              source: 'fallback',
            };
        } catch {
          // Never block the check-in: carry on with the usual question.
        }
      }
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
        observations = attributable(await repository.listObservations(userId), userId);
      } catch (err) {
        // The check-in must never be blocked. Not cached, so the next request tries again.
        logger.warn('Question history unavailable', {
          error: err instanceof Error ? err.name : 'UnknownError',
        });
        return fixed;
      }
      const evidence = buildEvidence(observations);
      const allowed = bank.options.map((o) => o.id);
      // Aggregate only: no dish names, ids, meal history or friend data.
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
    // Last 7 PKT days, keyed on when each meal was eaten (not when it was checked in).
    async getWeeklyPattern(userId: string, now = new Date()): Promise<PatternCard> {
      return weeklyPattern(
        attributable(await repository.listObservations(userId), userId),
        now,
        demoUserId !== undefined && userId === demoUserId,
      );
    },
    // The key must belong to the caller's own current card, recomputed here from their own rows.
    async createExperiment(
      userId: string,
      patternKey: string,
      action: ExperimentAction,
      now = new Date(),
    ): Promise<Experiment> {
      const card = await this.getWeeklyPattern(userId, now);
      if (card.pattern?.patternKey !== patternKey)
        throw new ValidationError('Choose an action from your current weekly card.');
      const current = await repository.findCurrentExperiment(userId);
      if (current?.status === 'active')
        throw new ConflictError('You already have a try-next-time choice in progress.');
      try {
        return await present(userId, await repository.insertExperiment(userId, patternKey, action));
      } catch (error) {
        // unique active-per-user index: another request got there first.
        if ((error as { code?: string }).code === '23505')
          throw new ConflictError('You already have a try-next-time choice in progress.');
        throw error;
      }
    },
    async getCurrentExperiment(userId: string): Promise<Experiment | null> {
      const row = await repository.findCurrentExperiment(userId);
      return row ? present(userId, row) : null;
    },
    async markExperimentTried(
      userId: string,
      id: string,
      mealId: string,
      now = new Date(),
    ): Promise<Experiment> {
      const experiment = await repository.findExperiment(userId, id);
      if (!experiment) throw new NotFoundError('Experiment not found');
      if (experiment.status !== 'active') throw new ConflictError('Already marked as tried.');
      const savedAt = await repository.findMealSavedAt(userId, mealId);
      if (savedAt === null || !(Date.parse(savedAt) > Date.parse(experiment.createdAt)))
        throw new ValidationError('Choose one of your meals saved after you made this choice.');
      const row = await repository.markExperimentTried(userId, id, mealId, now.toISOString());
      if (!row) throw new ConflictError('Already marked as tried.');
      return present(userId, row);
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
          // The pre_existing wording is always the fixed bank text, never Gemini's.
          ...(parsed.data.questionType ? { questionSource: 'fallback' as const } : {}),
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
