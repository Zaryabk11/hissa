import type { Router } from 'express';
import type { Config } from '../shared/config';
import type { Db } from '../shared/db';
import { createAuthModule } from './auth';
import { createFeelModule } from './feel';
import { createMealsModule } from './meals';
import { createNutritionModule } from './nutrition';
import { createPlanModule } from './plan';
import { createProfilesModule } from './profiles';
import { createScanModule } from './scan';
import { createStreaksModule } from './streaks';

// Registry: every module is built once (later tasks inject one module's service into another)
// and mounted at /api/<name>.
export function createModuleRouters(deps: { db: Db; config: Config }): Record<string, Router> {
  const auth = createAuthModule(deps);
  const profiles = createProfilesModule(deps);
  const nutrition = createNutritionModule(deps);
  const scan = createScanModule({ ...deps, nutrition: nutrition.service });
  const meals = createMealsModule({ ...deps, nutrition: nutrition.service });
  const plan = createPlanModule({
    ...deps,
    profiles: profiles.service,
    meals: meals.service,
    nutrition: nutrition.service,
  });
  const streaks = createStreaksModule(deps);
  const feel = createFeelModule(deps);

  return {
    auth: auth.router,
    profiles: profiles.router,
    scan: scan.router,
    nutrition: nutrition.router,
    plan: plan.router,
    meals: meals.router,
    streaks: streaks.router,
    feel: feel.router,
  };
}
