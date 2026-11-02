// Pure helpers for dates and the "your week so far" card.
import { kcalForItems, type Item } from './engine.ts';

/** Local calendar date as YYYY-MM-DD (the key meals are stored under). */
export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const MIN_DAYS_FOR_WEEK = 3;

export type DayTotal = { key: string; letter: string; kcal: number; hasMeals: boolean; isToday: boolean };
type MealsByDate = Record<string, { items: Item[] }[]>;

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The last `n` days ending today, oldest first, with each day's estimated kcal. */
export function lastDays(byDate: MealsByDate, today: Date, n = 7): DayTotal[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
    const key = dateKey(d);
    const meals = byDate[key] ?? [];
    return {
      key,
      letter: LETTERS[d.getDay()],
      kcal: meals.reduce((s, m) => s + kcalForItems(m.items), 0),
      hasMeals: meals.length > 0,
      isToday: i === n - 1,
    };
  });
}

export const weekHasEnoughData = (days: DayTotal[]): boolean => days.filter((d) => d.hasMeals).length >= MIN_DAYS_FOR_WEEK;

/** Average estimated kcal over the days that have meals. */
export const averageKcal = (days: DayTotal[]): number => {
  const logged = days.filter((d) => d.hasMeals);
  return logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
};
