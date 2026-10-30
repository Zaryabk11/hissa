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

// Registry: every module is mounted at /api/<name>.
export function createModuleRouters(deps: { db: Db; config: Config }): Record<string, Router> {
  return {
    auth: createAuthModule(deps).router,
    profiles: createProfilesModule(deps).router,
    scan: createScanModule(deps).router,
    nutrition: createNutritionModule(deps).router,
    plan: createPlanModule(deps).router,
    meals: createMealsModule(deps).router,
    streaks: createStreaksModule(deps).router,
    feel: createFeelModule(deps).router,
  };
}
