import { isAvoided, type Avoids } from '../profiles';
import type { RecipeCard } from './recipes.types';

const FITS_BUDGET = 3;
const OFTEN_EATEN = 1;
const OFTEN_EATEN_MIN = 2;
const HEAVY_PENALTY = 2;
const REJECTED_PENALTY = 1.5;
const LIMIT = 20;

export interface RankInput {
  recipes: RecipeCard[];
  avoids: Avoids;
  notForMe: Set<string>; // recipe ids
  remaining: number;
  counts: Record<string, number>;
  heavy: { dishes: Set<string>; categories: Set<string> };
  categoryOf: Record<string, string>;
}

// Pure: drop avoided and rejected recipes, score the rest, cheapest and A-Z break ties.
export function rank({
  recipes,
  avoids,
  notForMe,
  remaining,
  counts,
  heavy,
  categoryOf,
}: RankInput): RecipeCard[] {
  const rejected = recipes.filter((r) => notForMe.has(r.id));
  const score = (r: RecipeCard) =>
    (r.kcalPerUnit <= Math.max(remaining, 0) ? FITS_BUDGET : 0) +
    ((counts[r.dish] ?? 0) >= OFTEN_EATEN_MIN ? OFTEN_EATEN : 0) -
    (heavy.dishes.has(r.dish) || heavy.categories.has(categoryOf[r.dish] as string)
      ? HEAVY_PENALTY
      : 0) -
    (rejected.some((x) => x.dish === r.dish || (x.proteinType && x.proteinType === r.proteinType))
      ? REJECTED_PENALTY
      : 0);
  return recipes
    .filter(
      (r) =>
        !isAvoided(avoids, { slug: r.dish, proteinType: r.proteinType }) && !notForMe.has(r.id),
    )
    .map((r) => ({ r, s: score(r) }))
    .sort(
      (a, b) =>
        b.s - a.s || a.r.kcalPerUnit - b.r.kcalPerUnit || a.r.title.localeCompare(b.r.title),
    )
    .slice(0, LIMIT)
    .map(({ r }) => r);
}
