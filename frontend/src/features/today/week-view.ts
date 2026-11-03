import type { WeekDay } from './api/week';
import { todayContent as c } from './content';
import { fmt } from './format';

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type BarState = 'empty' | 'under' | 'at' | 'over';
export type WeekBar = {
  day: string;
  label: string;
  fraction: number;
  state: BarState;
  isToday: boolean;
  a11y: string;
};

/** Weekday name from "YYYY-MM-DD", via UTC so the device time zone cannot shift it. */
const weekdayName = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  return NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

/** Bars for the Today week card. Over budget is a state, never an alarm; the card styles it calmly. */
export function weekView(days: WeekDay[], budget: number) {
  const top = Math.max(budget, ...days.map((d) => d.totalCalories), 0);
  const frac = (n: number) => (top > 0 ? Math.min(1, n / top) : 0);
  const bars: WeekBar[] = days.map((d, i) => {
    const name = weekdayName(d.day);
    const logged = d.mealCount > 0;
    const state: BarState = !logged
      ? 'empty'
      : d.totalCalories > budget
        ? 'over'
        : d.totalCalories >= budget * 0.9
          ? 'at'
          : 'under';
    return {
      day: d.day,
      label: name.slice(0, 3),
      fraction: logged ? frac(d.totalCalories) : 0,
      state,
      isToday: i === days.length - 1,
      a11y: c.week.dayLabel(name, logged ? fmt(Math.round(d.totalCalories)) : null),
    };
  });
  const logged = days.filter((d) => d.mealCount > 0);
  const average = logged.length
    ? Math.round(logged.reduce((sum, d) => sum + d.totalCalories, 0) / logged.length)
    : 0;
  return {
    bars,
    empty: logged.length === 0,
    budgetFraction: frac(budget),
    summary: logged.length ? c.week.summary(logged.length, fmt(average)) : null,
  };
}
