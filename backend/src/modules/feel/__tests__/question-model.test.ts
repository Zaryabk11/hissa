import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { createFeelRepository } from '../feel.repository';
import type { MealObservation } from '../feel.types';
import {
  FEATURES,
  buildEvidence,
  rankQuestions,
  scoreIntents,
  type QuestionWeights,
} from '../question-model';
import { generateUser } from '../../../../scripts/synthetic-question-data';

let i = 0;
function meal(
  slugs: string[],
  stomach: MealObservation['stomach'],
  symptom: MealObservation['symptom'] = null,
): MealObservation {
  i += 1;
  return {
    userId: 'owner',
    mealId: `meal-${i}`,
    eatenAt: `2026-11-0${(i % 9) + 1}T12:00:00.000Z`,
    dishes: slugs.map((slug) => ({ slug, category: slug === 'biryani' ? 'rice' : 'other' })),
    energy: 'okay',
    stomach,
    symptom,
    answerId: null,
  };
}
// Weights that strongly favour pre_existing whenever they are used.
const favourPreExisting: QuestionWeights = {
  symptom_detail: FEATURES.map(() => 0),
  pre_existing: FEATURES.map(() => 10),
};

describe('per-user evidence', () => {
  it('keeps one mixed biryani+raita meal whole and names no culprit', () => {
    const evidence = buildEvidence([meal(['biryani', 'raita'], 'heavy', 'bloated')]);
    expect(evidence).toEqual({
      n: 1,
      discomfortRate: 2 / 3,
      unansweredSymptomShare: 0,
      candidate: null,
    });
  });

  it('raises raita as a candidate only once comparison meals exist', () => {
    const exposed = [
      meal(['biryani', 'raita'], 'heavy'),
      meal(['raita', 'roti'], 'heavy', 'bloated'),
      meal(['raita'], 'heavy'),
    ];
    expect(buildEvidence(exposed).candidate).toBeNull();
    const evidence = buildEvidence([
      ...exposed,
      meal(['biryani'], 'fine'),
      meal(['roti'], 'light'),
    ]);
    expect(evidence.candidate?.slug).toBe('raita');
    expect(evidence.candidate?.gap).toBeGreaterThan(0);
    expect(evidence.unansweredSymptomShare).toBeCloseTo(2 / 3);
  });

  it.each([0, 1])('uses the generic order with %i observations', (count) => {
    const evidence = buildEvidence(Array.from({ length: count }, () => meal(['raita'], 'heavy')));
    expect(rankQuestions(evidence, favourPreExisting)).toEqual(['symptom_detail', 'pre_existing']);
  });

  it('uses the generic order when every dish is in every meal and none is a candidate', () => {
    const evidence = buildEvidence(
      Array.from({ length: 10 }, () => meal(['daal', 'roti'], 'fine')),
    );
    expect(evidence.candidate).toBeNull();
    expect(rankQuestions(evidence, favourPreExisting)).toEqual(['symptom_detail', 'pre_existing']);
  });

  it('uses the generic order when the best dish has no positive gap', () => {
    const evidence = buildEvidence([
      meal(['raita'], 'fine'),
      meal(['raita'], 'fine'),
      meal(['roti'], 'heavy'),
    ]);
    expect(evidence.candidate?.gap).toBeLessThanOrEqual(0);
    expect(rankQuestions(evidence, favourPreExisting)).toEqual(['symptom_detail', 'pre_existing']);
  });

  it('breaks equal dish gaps by lowest slug', () => {
    const evidence = buildEvidence([
      meal(['zeera', 'achar'], 'heavy'),
      meal(['achar', 'zeera'], 'heavy'),
      meal(['roti'], 'fine'),
    ]);
    expect(evidence.candidate?.slug).toBe('achar');
  });

  it('lets trained weights reorder intents once there is history', () => {
    const evidence = buildEvidence([
      meal(['raita'], 'heavy'),
      meal(['raita'], 'heavy'),
      meal(['roti'], 'fine'),
    ]);
    expect(rankQuestions(evidence, favourPreExisting)).toEqual(['pre_existing', 'symptom_detail']);
  });

  it('changes the score when one new real check-in arrives', () => {
    const history = [meal(['raita'], 'heavy'), meal(['roti'], 'fine')];
    const before = scoreIntents(buildEvidence(history), favourPreExisting).pre_existing;
    const after = scoreIntents(
      buildEvidence([...history, meal(['raita', 'daal'], 'heavy')]),
      favourPreExisting,
    ).pre_existing;
    expect(after).not.toBe(before);
  });
});

describe('owner-scoped observation history', () => {
  // Minimal stand-in for PostgREST: applies .eq filters to the rows it holds.
  function fakeDb(rows: Record<string, unknown>[]) {
    const calls: unknown[][] = [];
    const builder = {
      filters: [] as [string, unknown][],
      select(...args: unknown[]) {
        calls.push(['select', ...args]);
        return builder;
      },
      eq(column: string, value: unknown) {
        calls.push(['eq', column, value]);
        builder.filters.push([column, value]);
        return builder;
      },
      order(...args: unknown[]) {
        calls.push(['order', ...args]);
        return builder;
      },
      then(resolve: (v: unknown) => void) {
        const data = rows.filter((r) => builder.filters.every(([c, v]) => r[c] === v));
        resolve({ data, error: null });
      },
    };
    const db = {
      from(table: string) {
        calls.push(['from', table]);
        return builder;
      },
    };
    return { db: db as unknown as Db, calls };
  }
  const checkin = (createdAt: string) => ({
    energy: 'low',
    stomach: 'heavy',
    symptom: null,
    answer_id: null,
    created_at: createdAt,
  });
  const rows = [
    {
      id: 'mine',
      user_id: 'owner',
      eaten_at: '2026-11-01T10:00:00+00:00',
      meal_items: [
        { confirmed: { slug: 'raita', category: 'other' } },
        { confirmed: { slug: 'raita', category: 'other' } },
        { confirmed: null },
      ],
      feel_checkins: checkin('2026-11-01T12:00:00+00:00'),
    },
    {
      id: 'late',
      user_id: 'owner',
      eaten_at: '2026-11-01T10:00:00+00:00',
      meal_items: [],
      feel_checkins: checkin('2026-11-02T10:00:01+00:00'),
    },
    {
      id: 'bare',
      user_id: 'owner',
      eaten_at: '2026-11-01T10:00:00+00:00',
      meal_items: [{ confirmed: null }],
      feel_checkins: checkin('2026-11-01T12:00:00+00:00'),
    },
    {
      id: 'theirs',
      user_id: 'other',
      eaten_at: '2026-11-01T10:00:00+00:00',
      meal_items: [],
      feel_checkins: checkin('2026-11-01T12:00:00+00:00'),
    },
  ];

  it('queries only the authenticated user and drops late check-ins and meals with no confirmed dish', async () => {
    const { db, calls } = fakeDb(rows);
    const observations = await createFeelRepository(db).listObservations('owner');
    expect(calls).toContainEqual(['from', 'meals']);
    expect(calls).toContainEqual(['eq', 'user_id', 'owner']);
    expect(observations).toEqual([
      {
        userId: 'owner',
        mealId: 'mine',
        eatenAt: '2026-11-01T10:00:00+00:00',
        dishes: [{ slug: 'raita', category: 'other' }],
        energy: 'low',
        stomach: 'heavy',
        symptom: null,
        answerId: null,
      },
    ]);
  });
});

describe('synthetic question data', () => {
  it('is deterministic for a seed', () => {
    expect(generateUser(7)).toEqual(generateUser(7));
    expect(generateUser(7)).not.toEqual(generateUser(8));
  });

  it('labels each user from its hidden kind', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const user = generateUser(seed);
      expect(user.label).toBe(user.kind === 'dish_linked' ? 'pre_existing' : 'symptom_detail');
    }
  });
});
