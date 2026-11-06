import type { Router } from 'express';
import type { Config } from '../shared/config';
import type { Db } from '../shared/db';
import type { Job } from '../shared/jobs';
import { createAuthModule } from './auth';
import { createFeelModule } from './feel';
import { createFriendsModule } from './friends';
import { createGoalsModule } from './goals';
import { createMealsModule } from './meals';
import { createNotificationsModule } from './notifications';
import { createNutritionModule } from './nutrition';
import { createPlanModule } from './plan';
import { createProfilesModule } from './profiles';
import { createRecipesModule } from './recipes';
import { createScanModule } from './scan';
import { createSnapsModule } from './snaps';
import { createStreaksModule } from './streaks';

// Registry: every module is built once (later tasks inject one module's service into another)
// and mounted at /api/<name>. `jobs` are background tasks the server starts .
export function createModuleRouters(deps: { db: Db; config: Config }): {
  routers: Record<string, Router>;
  jobs: Job[];
} {
  const auth = createAuthModule(deps);
  const profiles = createProfilesModule(deps);
  const nutrition = createNutritionModule(deps);
  const scan = createScanModule({
    ...deps,
    nutrition: nutrition.service,
    profiles: profiles.service,
  });
  const streaks = createStreaksModule(deps);
  const notifications = createNotificationsModule({ ...deps, profiles: profiles.service });
  const friends = createFriendsModule({
    ...deps,
    streaks: streaks.service,
    profiles: profiles.service,
    notifications: notifications.service,
  });
  const goals = createGoalsModule({
    ...deps,
    streaks: streaks.service,
    friends: friends.service,
    notifications: notifications.service,
    profiles: profiles.service,
  });
  const meals = createMealsModule({
    ...deps,
    nutrition: nutrition.service,
    streaks: streaks.service,
    goals: goals.service,
  });
  const plan = createPlanModule({
    ...deps,
    profiles: profiles.service,
    meals: meals.service,
    nutrition: nutrition.service,
  });
  const feel = createFeelModule(deps);
  const recipes = createRecipesModule({
    ...deps,
    profiles: profiles.service,
    meals: meals.service,
    feel: feel.service,
    nutrition: nutrition.service,
  });
  const snaps = createSnapsModule({
    ...deps,
    friends: friends.service,
    meals: meals.service,
    profiles: profiles.service,
  });

  const routers: Record<string, Router> = {
    auth: auth.router,
    profiles: profiles.router,
    scan: scan.router,
    nutrition: nutrition.router,
    plan: plan.router,
    meals: meals.router,
    streaks: streaks.router,
    friends: friends.router,
    goals: goals.router,
    notifications: notifications.router,
    feel: feel.router,
    recipes: recipes.router,
  };
  // The sweeper always runs so photos stored before the flag was turned off are still deleted.
  if (!deps.config.SNAPS_ENABLED) return { routers, jobs: snaps.jobs };
  return { routers: { ...routers, snaps: snaps.router }, jobs: snaps.jobs };
}
