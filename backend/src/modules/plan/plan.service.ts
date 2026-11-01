import type { MealsService } from '../meals';
import type { Dish, NutritionService, Unit } from '../nutrition';
import type { ProfilesService } from '../profiles';
import type { Plan, PlanItem } from './plan.types';

interface PlanDeps {
  profiles: Pick<ProfilesService, 'getDailyBudget'>;
  meals: Pick<MealsService, 'caloriesToday'>;
  nutrition: Pick<NutritionService, 'getDish' | 'portionNutrition' | 'listCatalog'>;
}

// Smallest portion step per unit; the minimum portion is one step.
const STEP: Record<Unit, number> = {
  roti: 1,
  piece: 1,
  glass: 1,
  katori: 0.5,
  bowl: 0.5,
  plate: 0.5,
};
const SUGGESTION_SLUGS = ['salad', 'raita'];

// Business rules for plan: fit confirmed dishes to the remaining daily budget.
export function createPlanService({ profiles, meals, nutrition }: PlanDeps) {
  async function toItem(dish: Dish, requestedUnits: number, units: number): Promise<PlanItem> {
    const n = await nutrition.portionNutrition(dish.slug, units);
    return {
      slug: dish.slug,
      name: dish.name,
      unit: dish.unit,
      requestedUnits,
      units,
      calories: n.calories,
      proteinG: n.proteinG,
      carbsG: n.carbsG,
      fatG: n.fatG,
    };
  }

  return {
    async buildPlan(
      userId: string,
      requested: Array<{ slug: string; units: number }>,
    ): Promise<Plan> {
      const remaining =
        (await profiles.getDailyBudget(userId)) - (await meals.caloriesToday(userId));
      const dishes = await Promise.all(requested.map((r) => nutrition.getDish(r.slug)));
      const step = (i: number) => STEP[(dishes[i] as Dish).unit];
      const build = (units: number[]) =>
        Promise.all(
          dishes.map((d, i) =>
            toItem(d, (requested[i] as { units: number }).units, units[i] as number),
          ),
        );
      const finish = (
        kind: Plan['kind'],
        items: PlanItem[],
        suggestions: PlanItem[] = [],
      ): Plan => {
        const totalCalories = items.reduce((sum, i) => sum + i.calories, 0);
        return {
          kind,
          remainingBefore: remaining,
          totalCalories,
          remainingAfter: remaining - totalCalories,
          items,
          suggestions,
          isEstimate: true,
        };
      };

      if (remaining <= 0) {
        const suggested = (await nutrition.listCatalog()).filter(
          (d) => SUGGESTION_SLUGS.includes(d.slug) && !requested.some((r) => r.slug === d.slug),
        );
        return finish(
          'light',
          await build(requested.map((r, i) => Math.min(r.units, step(i)))),
          await Promise.all(suggested.map((d) => toItem(d, STEP[d.unit], STEP[d.unit]))),
        );
      }

      const units = requested.map((r) => r.units);
      const items = await build(units);
      const total = () => items.reduce((sum, i) => sum + i.calories, 0);
      let kind: Plan['kind'] = 'full';
      while (total() > remaining) {
        kind = 'reduced';
        let pick = -1;
        items.forEach((item, i) => {
          if (
            (units[i] as number) > step(i) &&
            (pick < 0 || item.calories > (items[pick] as PlanItem).calories)
          )
            pick = i;
        });
        if (pick < 0) {
          kind = 'minimum';
          break;
        }
        units[pick] = Math.max(step(pick), (units[pick] as number) - step(pick));
        items[pick] = await toItem(
          dishes[pick] as Dish,
          (requested[pick] as { units: number }).units,
          units[pick] as number,
        );
      }
      return finish(kind, items);
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;
