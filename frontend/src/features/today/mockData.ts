// Mock states for Today. Pick one with MOCK_DEFAULT or `?mock=` in the URL (/today?mock=empty, ?mock=loading, ?mock=over).
// In a mock state Today shows these meals and ignores what is stored.
import { kcalForItems, type Item } from '../nutrition/engine';
import type { StoredMeal } from './mealsStore';

export type MockState = 'meals' | 'empty' | 'loading' | 'over';
/** `meals` here means "no mock": show the real stored meals. */
export const MOCK_DEFAULT: MockState = 'meals';

export const MOCK_PROFILE = { name: 'Zaryab', buddy: 'Hamza', buddyLogged: false, streak: 12 };

const at = (h: number, m: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
};

const MEALS: StoredMeal[] = [
  { id: 'mock1', at: at(8, 30), items: [{ dishId: 'paratha', qty: 1 }, { dishId: 'chai', qty: 1 }] },
  { id: 'mock2', at: at(13, 10), items: [{ dishId: 'chicken-karahi', qty: 1 }, { dishId: 'roti', qty: 1.5 }] },
];

/** `budget` lets the "over" case always exceed whatever the onboarding number is. */
export function getMockMeals(state: MockState, budget: number): StoredMeal[] {
  if (state === 'empty' || state === 'loading') return [];
  if (state !== 'over') return MEALS;
  const base = kcalForItems(MEALS.flatMap((m) => m.items));
  const extra: Item = { dishId: 'biryani', qty: Math.ceil((budget - base + 1) / 290 / 0.5) * 0.5 };
  return [...MEALS, { id: 'mock3', at: at(20, 15), items: [extra] }];
}
