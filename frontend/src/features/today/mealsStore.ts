import { createStore, loadJSON, removeKeys, saveJSON } from '../../shared/storage';
import type { Item } from '../nutrition/engine';
import { dateKey } from '../nutrition/week';

/** A meal the user ate: when, and what (dish and how many units). Calories are always derived, never stored. */
export type StoredMeal = { id: string; at: number; items: Item[] };
export type MealsByDate = Record<string, StoredMeal[]>;

const KEY = 'hissa.meals';
const store = createStore<{ byDate: MealsByDate; hydrated: boolean }>({ byDate: {}, hydrated: false });
let touched = false;

const commit = (byDate: MealsByDate) => {
  touched = true;
  store.set({ byDate });
  saveJSON(KEY, byDate);
};

export async function hydrateMeals() {
  const saved = await loadJSON<MealsByDate>(KEY);
  store.set(saved && !touched ? { byDate: saved, hydrated: true } : { hydrated: true });
}

export const useMealsByDate = (): MealsByDate => store.use().byDate;
export const useMealsHydrated = (): boolean => store.use().hydrated;
/** Meals for one local date; a date with nothing saved (like a new day) is an empty list. */
export const mealsOn = (byDate: MealsByDate, key: string): StoredMeal[] => byDate[key] ?? [];

export function addMeal(items: Item[], at = Date.now()): StoredMeal {
  const meal = { id: `m${at}-${Math.random().toString(36).slice(2, 6)}`, at, items };
  restoreMeal(meal);
  return meal;
}

/** Puts a meal back under its own date (also how Undo works). */
export function restoreMeal(meal: StoredMeal) {
  const key = dateKey(new Date(meal.at));
  const { byDate } = store.get();
  commit({ ...byDate, [key]: [...mealsOn(byDate, key), meal].sort((a, b) => a.at - b.at) });
}

export function updateMealItems(id: string, items: Item[]) {
  const { byDate } = store.get();
  commit(Object.fromEntries(Object.entries(byDate).map(([k, ms]) => [k, ms.map((m) => (m.id === id ? { ...m, items } : m))])));
}

export const findMeal = (id: string): StoredMeal | undefined =>
  Object.values(store.get().byDate).flat().find((m) => m.id === id);

export function removeMeal(id: string) {
  const { byDate } = store.get();
  commit(Object.fromEntries(Object.entries(byDate).map(([k, ms]) => [k, ms.filter((m) => m.id !== id)])));
}

export function replaceAllMeals(byDate: MealsByDate) {
  commit(byDate);
}

export function clearAllMeals() {
  touched = true;
  store.set({ byDate: {} });
  removeKeys([KEY]);
}
