import type { MealObservation } from './feel.types';
import { trainingReport } from './question-weights';

// Question types only: the model picks which approved question to ask, never a diagnosis.
export type QuestionIntent = 'symptom_detail' | 'pre_existing';
export const GENERIC_ORDER: QuestionIntent[] = ['symptom_detail', 'pre_existing'];
export const FEATURES = [
  'bias',
  'discomfortRate',
  'positiveGap',
  'comparisonSupport',
  'unansweredSymptomShare',
] as const;
export type QuestionWeights = Record<QuestionIntent, number[]>;

export interface Candidate {
  slug: string;
  exposedN: number;
  comparisonN: number;
  exposedRate: number;
  comparisonRate: number;
  gap: number;
}
export interface Evidence {
  n: number;
  discomfortRate: number;
  unansweredSymptomShare: number;
  candidate: Candidate | null;
}

// The offline ranker is used only if it beat the fixed order on held-out synthetic users.
export const useTrainedRanker = trainingReport.heldOutAccuracy > trainingReport.baselineAccuracy;

const smoothed = (heavy: number, n: number) => (heavy + 1) / (n + 2); // Beta(1,1)
const isHeavy = (o: MealObservation) => o.stomach === 'heavy';

export function buildEvidence(observations: MealObservation[]): Evidence {
  const n = observations.length;
  const heavy = observations.filter(isHeavy);
  const slugs = [...new Set(observations.flatMap((o) => o.dishes.map((d) => d.slug)))].sort();
  let candidate: Candidate | null = null;
  for (const slug of slugs) {
    const exposed = observations.filter((o) => o.dishes.some((d) => d.slug === slug));
    const comparisonN = n - exposed.length;
    // A dish needs repeat exposure and at least one meal without it before it can be a candidate.
    if (exposed.length < 2 || comparisonN < 1) continue;
    const exposedHeavy = exposed.filter(isHeavy).length;
    const exposedRate = smoothed(exposedHeavy, exposed.length);
    const comparisonRate = smoothed(heavy.length - exposedHeavy, comparisonN);
    const gap = exposedRate - comparisonRate;
    if (!candidate || gap > candidate.gap) {
      candidate = { slug, exposedN: exposed.length, comparisonN, exposedRate, comparisonRate, gap };
    }
  }
  return {
    n,
    discomfortRate: smoothed(heavy.length, n),
    unansweredSymptomShare: heavy.length
      ? heavy.filter((o) => o.symptom === null).length / heavy.length
      : 0,
    candidate,
  };
}

export function features(e: Evidence): number[] {
  return [
    1,
    e.discomfortRate,
    Math.max(0, e.candidate?.gap ?? 0),
    Math.min(e.candidate?.comparisonN ?? 0, 5) / 5,
    e.unansweredSymptomShare,
  ];
}

export function scoreIntents(
  e: Evidence,
  weights: QuestionWeights,
): Record<QuestionIntent, number> {
  const x = features(e);
  const dot = (w: number[]) => w.reduce((sum, wi, k) => sum + wi * (x[k] ?? 0), 0);
  return { symptom_detail: dot(weights.symptom_detail), pre_existing: dot(weights.pre_existing) };
}

export function rankQuestions(e: Evidence, weights: QuestionWeights): QuestionIntent[] {
  if (e.n < 2) return [...GENERIC_ORDER];
  const score = scoreIntents(e, weights);
  // Stable sort keeps symptom_detail first on a tie.
  return [...GENERIC_ORDER].sort((a, b) => score[b] - score[a]);
}
