// DEMO helpers, not for normal users. Reached only by URL: /today?demo=1 (fill) and /today?demo=clear (wipe).
import { removeKeys } from '../../shared/storage';
import type { Item } from '../nutrition/engine';
import { resetAnswers } from '../onboarding/store';
import { clearAllMeals, replaceAllMeals, type MealsByDate } from './mealsStore';
import { dateKey } from '../nutrition/week';

type Slot = [hour: number, items: Item[]];
const i = (dishId: string, qty: number): Item => ({ dishId, qty });

// Six full past days of realistic desi meals, about 1,500 to 2,300 estimated kcal each.
const PAST_DAYS: Slot[][] = [
  [[8, [i('paratha', 1), i('chai', 1)]], [13, [i('biryani', 1.5), i('raita', 1), i('salad', 1)]], [20, [i('chicken-curry', 1), i('roti', 2), i('daal', 0.5)]]],
  [[9, [i('egg', 2), i('roti', 1), i('chai', 1)]], [13, [i('daal', 1), i('rice', 1), i('sabzi', 1)]], [17, [i('samosa', 1), i('chai', 1)]], [20, [i('mutton-curry', 1), i('roti', 2), i('salad', 1)]]],
  [[8, [i('paratha', 1), i('egg', 1), i('chai', 1)]], [14, [i('chicken-karahi', 1), i('roti', 2), i('raita', 1)]], [21, [i('daal', 1), i('roti', 2), i('sabzi', 1)]]],
  [[9, [i('haleem', 1), i('naan', 0.5), i('lassi', 1)]], [14, [i('rice', 1), i('chana', 1), i('raita', 1)]], [20, [i('kebab', 3), i('roti', 2), i('salad', 1), i('kheer', 0.5)]]],
  [[8, [i('roti', 2), i('egg', 2), i('chai', 1)]], [13, [i('pulao', 1), i('raita', 1), i('salad', 1)]], [20, [i('nihari', 1), i('naan', 1)]]],
  [[8, [i('paratha', 1), i('chai', 1)]], [13, [i('palak-paneer', 1), i('roti', 2)]], [16, [i('pakora', 4), i('chai', 1)]], [20, [i('chicken-curry', 1), i('rice', 1), i('salad', 1)]]],
];

// Today so far: leaves a few hundred kcal, so a full plate from the scan flow shows the light plan.
const TODAY: Slot[] = [
  [8, [i('paratha', 1), i('chai', 1)]],
  [13, [i('chicken-karahi', 1), i('roti', 2), i('raita', 1), i('salad', 1)]],
  [16, [i('samosa', 1), i('chai', 1)]],
];

export function fillDemoData(now = new Date()) {
  const byDate: MealsByDate = {};
  const days = [...PAST_DAYS, TODAY];
  days.forEach((slots, idx) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days.length - 1 - idx));
    byDate[dateKey(day)] = slots.map(([hour, items], n) => ({
      id: `demo-${dateKey(day)}-${n}`,
      at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 15).getTime(),
      items,
    }));
  });
  replaceAllMeals(byDate);
}

/** Wipes meals and onboarding answers, in memory and in storage. */
export function clearAllData() {
  clearAllMeals();
  resetAnswers();
  removeKeys(['hissa.onboarding']);
}
