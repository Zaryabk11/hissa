import type { ApiMeal, MealInput } from '../core/api';
import { dishById } from '../nutrition/catalog';
import { kcalForItems, type Item } from '../nutrition/engine';
import { stepQty } from '../scan/scanPayload';
import { dateLabel, dayLabel, fmt } from '../today/format';
import { historyContent as c } from './content';

export type HistoryDay = { day: string; totalCalories: number; meals: ApiMeal[] };
/** One dish being edited: the same shape the nutrition helpers use. */
export type Line = Item;

export const kcalLabel = (kcal: number): string => c.kcal(fmt(Math.round(kcal)));
export const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
/** "Tuesday, 3 Nov" for a meal's own time, in the device time zone. */
export const mealDateLabel = (iso: string): string => dateLabel(new Date(iso));
export const dishName = (id: string): string => dishById(id)?.name ?? id;

/** The dishes the person confirmed. Predictions they removed are not part of the meal they ate. */
export const confirmedLines = (meal: ApiMeal): Line[] =>
  meal.items.flatMap((i) =>
    i.confirmedDish && i.confirmedPortion ? [{ dishId: i.confirmedDish, qty: i.confirmedPortion }] : [],
  );

export function mealRow(meal: ApiMeal) {
  const names = confirmedLines(meal).map((l) => dishName(l.dishId)).join(', ');
  return {
    id: meal.id,
    time: timeLabel(meal.eatenAt),
    names: names || c.fallbackName,
    kcal: kcalLabel(meal.totalCalories),
  };
}

/** Newest day first, newest meal first within a day; the API order is not relied on. */
export const dayRows = (days: HistoryDay[]) =>
  [...days]
    .sort((a, b) => b.day.localeCompare(a.day))
    .map((d) => ({
      day: d.day,
      heading: dayLabel(d.day),
      total: kcalLabel(d.totalCalories),
      meals: [...d.meals]
        .sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))
        .map(mealRow),
    }));

/** One portion tap, the same step Review uses. A dish missing from the catalog stays as it is. */
export const stepLine = (lines: Line[], index: number, direction: 1 | -1): Line[] =>
  lines.map((l, i) => {
    const dish = dishById(l.dishId);
    return i === index && dish ? { ...l, qty: stepQty(l.qty, dish.unit, direction) } : l;
  });

/** Remove a dish, but never the last one. */
export const removeLine = (lines: Line[], index: number): Line[] =>
  lines.length <= 1 ? lines : lines.filter((_, i) => i !== index);

export const isChanged = (lines: Line[], meal: ApiMeal): boolean => {
  const before = confirmedLines(meal);
  return lines.length !== before.length || lines.some((l, i) => l.dishId !== before[i]!.dishId || l.qty !== before[i]!.qty);
};

export const canSave = (lines: Line[], meal: ApiMeal): boolean => lines.length >= 1 && isChanged(lines, meal);

export const editTotal = (lines: Line[]): number => kcalForItems(lines);

/** PATCH body: the meal's own items with the new portions. Predictions are sent back untouched so the original guess is kept. */
export function savePayload(lines: Line[], meal: ApiMeal): { items: MealInput[] } {
  const left = [...lines];
  const items = meal.items.map((i): MealInput => {
    if (!i.confirmedDish || !i.confirmedPortion) return i;
    const k = left.findIndex((l) => l.dishId === i.confirmedDish);
    if (k < 0) return { ...i, confirmedDish: null, confirmedPortion: null };
    const [line] = left.splice(k, 1);
    return { ...i, confirmedPortion: line!.qty };
  });
  return { items };
}

/** A 404 means the meal is gone; anything else is worth another try. */
export const failureKind = (status: number | undefined): 'gone' | 'error' => (status === 404 ? 'gone' : 'error');

export const saveFailureText = (status: number | undefined): string =>
  status === 400 ? c.detail.saveInvalid : c.detail.saveError;
