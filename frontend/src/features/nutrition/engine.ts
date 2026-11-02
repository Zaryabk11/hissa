// Pure nutrition functions. No UI imports, so they can be tested in plain node. All kcal are estimates.
import { dishById, type Dish } from './catalog.ts';

/** One dish on a plate: how many units (roti, katori, pieces, cups) of it. */
export type Item = { dishId: string; qty: number };

export const HALF = 0.5;
/** A light plate aims for at least this many kcal, even when almost nothing is left in the budget. */
export const LIGHT_FLOOR_KCAL = 250;

export const kcalForItem = (item: Item): number => {
  const dish = dishById(item.dishId);
  return dish ? Math.round(dish.kcalPerUnit * item.qty) : 0;
};

export const kcalForItems = (items: Item[]): number => items.reduce((sum, i) => sum + kcalForItem(i), 0);

/** Budget minus eaten. Negative once the day is over budget. */
export const remainingBudget = (budget: number, eaten: number): number => budget - eaten;

export type Plan = {
  items: Item[];
  /** Estimated kcal of the planned plate. */
  kcal: number;
  /** True when the full plate would not fit, so a lighter one is suggested. */
  light: boolean;
};

/**
 * The plate to suggest for what is left. If `wanted` fits in `remaining` it is returned as is. If not, portions
 * come down in half steps, biggest dish first, never below half a unit and never touching "as much as you like"
 * dishes, aiming at the remaining kcal (or LIGHT_FLOOR_KCAL if that is higher). Nothing is ever removed.
 */
export function planForRemaining(remaining: number, wanted: Item[]): Plan {
  const full = kcalForItems(wanted);
  if (full <= remaining) return { items: wanted.map((i) => ({ ...i })), kcal: full, light: false };

  const target = Math.max(remaining, LIGHT_FLOOR_KCAL);
  const items = wanted.map((i) => ({ ...i }));
  const reducible = (i: Item, d: Dish | undefined) => !!d && !d.free && i.qty - HALF >= HALF;
  while (kcalForItems(items) > target) {
    let pick: Item | null = null;
    for (const i of items) {
      if (reducible(i, dishById(i.dishId)) && (!pick || kcalForItem(i) > kcalForItem(pick))) pick = i;
    }
    if (!pick) break;
    pick.qty -= HALF;
  }
  return { items, kcal: kcalForItems(items), light: true };
}

/** "1.5 roti", "Half katori", "2 pieces", "1 cup", "As much as you like". */
export function portionText(item: Item): string {
  const dish = dishById(item.dishId);
  if (!dish) return '';
  if (dish.free) return 'As much as you like';
  const { qty } = item;
  if (dish.unit === 'roti') return `${qty} roti`;
  const one = dish.unit === 'piece' ? 'piece' : dish.unit;
  if (qty === HALF) return `Half ${one}`;
  const many = dish.unit === 'piece' && qty !== 1 ? 'pieces' : dish.unit === 'cup' && qty > 1 ? 'cups' : one;
  return `${qty} ${many}`;
}

/** Display name of a plate, e.g. "Chicken karahi, Roti". */
export const mealName = (items: Item[]): string =>
  items
    .map((i) => dishById(i.dishId)?.name ?? '')
    .filter(Boolean)
    .join(', ');
