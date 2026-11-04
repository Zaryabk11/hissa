import { todayContent as c } from './content';

export function ringView(budget: number, eaten: number, empty: boolean) {
  const shown = Math.round(empty ? budget : Math.max(0, budget - eaten));
  return {
    shown,
    caption: empty ? c.ring.forToday : c.ring.left,
    fraction: budget > 0 ? eaten / budget : 0,
    // At or over budget: say it kindly (design k). There is never a red state.
    atBudget: !empty && budget > 0 && eaten >= budget,
  };
}

export type StreakStatus = { streak: number; loggedToday: boolean };
export type StreakCard = { kind: 'streak'; streak: number; loggedToday: boolean } | { kind: 'hidden' };

/** Your own streak only: no friend data reaches Today. Null means the status could not load. */
export function streakCard(s: StreakStatus | null): StreakCard {
  return s ? { kind: 'streak', streak: s.streak, loggedToday: s.loggedToday } : { kind: 'hidden' };
}

export type MacroTargets = { proteinG: number | null; carbsG: number | null; fatG: number | null };

/** One row per macro for the Today macros card, or null when no target is set. Grams are estimates. */
export function macroRows(
  eaten: { proteinG: number; carbsG: number; fatG: number },
  t: MacroTargets,
): { label: string; text: string }[] | null {
  if (t.proteinG === null && t.carbsG === null && t.fatG === null) return null;
  const row = (label: string, got: number, target: number | null) => ({
    label,
    text: `${Math.round(got)}${target === null ? '' : ` / ${target}`} g`,
  });
  return [
    row('Protein', eaten.proteinG, t.proteinG),
    row('Carbs', eaten.carbsG, t.carbsG),
    row('Fat', eaten.fatG, t.fatG),
  ];
}
