import { pktDay, pktDayBounds } from '../../shared/time/pkt';
import type { MealObservation } from './feel.types';

export type { MealObservation };

// Pure logic: whole-meal observations (confirmed dishes only, never predicted scan slugs) in,
// one private weekly card out. Copy states what the logs show, never a cause or a diagnosis.
export const NEEDED_CHECKINS = 7;
const MIN_RELEVANT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PatternOutcome = 'heavy' | 'good_energy';
export interface PatternEvidence {
  patternKey: string; // stable across weeks: `${kind}:${subject}:${outcome}`
  kind: 'category' | 'dish';
  subject: string; // dish category or confirmed dish slug
  outcome: PatternOutcome;
  matching: number; // relevant meals with the outcome
  relevant: number; // meals containing the subject
  comparison: { matching: number; total: number } | null; // meals without the dish (dish cards only)
}
export interface PatternCard {
  state: 'insufficient_data' | 'no_pattern' | 'question' | 'pattern';
  isSample: boolean;
  checkins: number; // check-ins in the window
  needed: number;
  window: { from: string; to: string }; // PKT days, inclusive
  pattern: PatternEvidence | null;
  label: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  rice: 'rice dishes',
  roti: 'roti',
  fried: 'fried dishes',
  lentil: 'lentil dishes',
  meat: 'meat dishes',
  sweets: 'sweets',
};
const OUTCOMES: Record<PatternOutcome, { test: (o: MealObservation) => boolean; phrase: string }> =
  {
    heavy: { test: (o) => o.stomach === 'heavy', phrase: 'a heavy stomach' },
    good_energy: { test: (o) => o.energy === 'good', phrase: 'good energy' },
  };

const dayBefore = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);
const asText = (slug: string) => slug.replace(/[-_]+/g, ' ');
// Integer maths so 2 of 3 is exactly 66.7% and the 60% and 25 point cut-offs have no float edge.
const atLeast60 = (m: number, n: number) => m * 5 >= n * 3;

interface Candidate extends PatternEvidence {
  gapOk: boolean;
}

export function weeklyPattern(
  observations: MealObservation[],
  now: Date,
  isSample = false,
): PatternCard {
  const today = pktDay(now);
  const from = dayBefore(today, 6);
  const start = Date.parse(pktDayBounds(from).startIso);
  const end = Date.parse(pktDayBounds(today).endIso);
  const seen = new Set<string>();
  const week = observations.filter((o) => {
    const t = Date.parse(o.eatenAt);
    if (seen.has(o.mealId) || !(t >= start && t < end)) return false;
    seen.add(o.mealId);
    return true;
  });
  const base = {
    isSample,
    checkins: week.length,
    needed: NEEDED_CHECKINS,
    window: { from, to: today },
  };

  if (week.length < NEEDED_CHECKINS) {
    return {
      ...base,
      state: 'insufficient_data',
      pattern: null,
      label: `${week.length} of ${NEEDED_CHECKINS} check-ins this week. Keep logging to see your weekly pattern.`,
    };
  }

  const candidates: Candidate[] = [];
  const consider = (
    kind: 'category' | 'dish',
    subject: string,
    exposed: MealObservation[],
    others: MealObservation[] | null,
  ) => {
    for (const outcome of Object.keys(OUTCOMES) as PatternOutcome[]) {
      const test = OUTCOMES[outcome].test;
      const matching = exposed.filter(test).length;
      if (exposed.length < MIN_RELEVANT || !atLeast60(matching, exposed.length)) continue;
      const comparison = others && { matching: others.filter(test).length, total: others.length };
      // Dish cards also need 3 comparison meals and an observed gap of 25 points or more.
      const gapOk =
        !comparison ||
        (comparison.total >= MIN_RELEVANT &&
          4 * (matching * comparison.total - comparison.matching * exposed.length) >=
            exposed.length * comparison.total);
      candidates.push({
        patternKey: `${kind}:${subject}:${outcome}`,
        kind,
        subject,
        outcome,
        matching,
        relevant: exposed.length,
        comparison,
        gapOk,
      });
    }
  };

  // ponytail: category "other" is a catch-all, so it never forms a category pattern.
  const categories = [...new Set(week.flatMap((o) => o.dishes.map((d) => d.category)))]
    .filter((c) => c !== 'other')
    .sort();
  for (const c of categories) {
    consider(
      'category',
      c,
      week.filter((o) => o.dishes.some((d) => d.category === c)),
      null,
    );
  }

  // A dish that always appears with another dish cannot be told apart from it: skip both.
  const mealsByDish = new Map<string, MealObservation[]>();
  for (const o of week) {
    for (const slug of new Set(o.dishes.map((d) => d.slug))) {
      mealsByDish.set(slug, [...(mealsByDish.get(slug) ?? []), o]);
    }
  }
  const signature = (meals: MealObservation[]) =>
    meals
      .map((m) => m.mealId)
      .sort()
      .join('|');
  const signatures = [...mealsByDish.values()].map(signature);
  for (const [slug, exposed] of [...mealsByDish].sort(([a], [b]) => a.localeCompare(b))) {
    if (signatures.filter((s) => s === signature(exposed)).length > 1) continue;
    consider(
      'dish',
      slug,
      exposed,
      week.filter((o) => !exposed.includes(o)),
    );
  }

  const best = (list: Candidate[]) =>
    [...list].sort(
      (a, b) =>
        b.matching * a.relevant - a.matching * b.relevant ||
        b.matching - a.matching ||
        a.patternKey.localeCompare(b.patternKey),
    )[0];
  const found = best(candidates.filter((c) => c.gapOk));
  if (found)
    return { ...base, state: 'pattern', pattern: strip(found), label: describe(found, false) };
  // A dish that looks consistent but lacks enough comparison meals stays a question.
  const question = best(candidates.filter((c) => c.kind === 'dish'));
  if (question)
    return {
      ...base,
      state: 'question',
      pattern: strip(question),
      label: describe(question, true),
    };
  return {
    ...base,
    state: 'no_pattern',
    pattern: null,
    label: `${week.length} check-ins this week, and no consistent pattern in your logs yet.`,
  };
}

function strip({ gapOk: _gapOk, ...evidence }: Candidate): PatternEvidence {
  return evidence;
}

function describe(c: Candidate, question: boolean): string {
  const what = c.kind === 'dish' ? asText(c.subject) : (CATEGORY_NAMES[c.subject] ?? c.subject);
  let text = `In your logs, you reported ${OUTCOMES[c.outcome].phrase} after ${c.matching} of ${c.relevant} meals containing ${what}.`;
  if (c.comparison) {
    const { matching, total } = c.comparison;
    text += ` Without it: ${matching} of ${total} meals.`;
    if (question) {
      text +=
        total < MIN_RELEVANT
          ? ' There are too few meals without it to compare, so this is still worth exploring.'
          : ' The meals without it look similar, so this is still worth exploring.';
    }
  }
  return `${text} This only describes your own logs.`;
}
