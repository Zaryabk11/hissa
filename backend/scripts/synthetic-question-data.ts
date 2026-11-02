// SYNTHETIC ONLY: simulated meal histories for training the question ranker offline.
// Never written to the database and never mixed with a real user's evidence.
import type { MealObservation } from '../src/modules/feel/feel.types';
import type { QuestionIntent } from '../src/modules/feel/question-model';

export const GENERATOR_VERSION = 'synthetic-questions-v1';
export type UserKind = 'dish_linked' | 'generic' | 'null';
export interface SyntheticUser {
  seed: number;
  kind: UserKind;
  label: QuestionIntent;
  observations: MealObservation[];
}

const DISHES = [
  { slug: 'biryani', category: 'rice' },
  { slug: 'raita', category: 'other' },
  { slug: 'roti', category: 'roti' },
  { slug: 'daal', category: 'lentil' },
  { slug: 'karahi', category: 'meat' },
  { slug: 'pakora', category: 'fried' },
  { slug: 'kheer', category: 'sweets' },
  { slug: 'sabzi', category: 'other' },
];
const SYMPTOMS = ['bloated', 'upset', 'other', 'not_sure'] as const;
const ENERGY = ['low', 'okay', 'good'] as const;

// mulberry32: small seeded PRNG so every run produces the same data.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateUser(seed: number): SyntheticUser {
  const rand = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T>(xs: readonly T[]): T => xs[int(0, xs.length - 1)] as T;
  const kind = pick(['dish_linked', 'generic', 'null'] as const);
  const hidden = pick(DISHES).slug;
  const days = int(2, 14);
  const observations: MealObservation[] = [];
  for (let day = 0; day < days; day += 1) {
    const meals = int(1, 2);
    for (let m = 0; m < meals; m += 1) {
      const pool = [...DISHES];
      for (let k = pool.length - 1; k > 0; k -= 1) {
        const j = int(0, k); // Fisher-Yates
        [pool[k], pool[j]] = [
          pool[j] as (typeof DISHES)[number],
          pool[k] as (typeof DISHES)[number],
        ];
      }
      const dishes = pool.slice(0, int(1, 3));
      const pHeavy =
        kind === 'dish_linked'
          ? dishes.some((d) => d.slug === hidden)
            ? 0.8
            : 0.1
          : kind === 'generic'
            ? 0.5
            : 0.08;
      const heavy = rand() < pHeavy;
      const stomach = heavy ? 'heavy' : rand() < 0.7 ? 'fine' : 'light';
      observations.push({
        userId: `synthetic-${seed}`,
        mealId: `synthetic-${seed}-${observations.length}`,
        eatenAt: new Date(Date.UTC(2026, 9, 1 + day, m ? 15 : 8)).toISOString(),
        dishes,
        energy: pick(ENERGY),
        stomach,
        // Some heavy check-ins skip the optional symptom detail.
        symptom: heavy && rand() < 0.6 ? pick(SYMPTOMS) : null,
        answerId: null,
      });
    }
  }
  return {
    seed,
    kind,
    label: kind === 'dish_linked' ? 'pre_existing' : 'symptom_detail',
    observations,
  };
}
