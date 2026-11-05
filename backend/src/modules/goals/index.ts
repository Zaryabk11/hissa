import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { FriendsService } from '../friends';
import type { NotificationsService } from '../notifications';
import type { ProfilesService } from '../profiles';
import type { StreaksService } from '../streaks';
import { createGoalsController } from './goals.controller';
import { createGoalsRepository } from './goals.repository';
import { createGoalsRouter } from './goals.routes';
import { createGoalsService, type GoalsService } from './goals.service';

export type { GoalsService };
export type { Celebration, FriendGoal, Goal, GoalInput } from './goals.types';

// The only file other modules may import.
export function createGoalsModule({
  db,
  streaks,
  friends,
  notifications,
  profiles,
}: {
  db: Db;
  streaks: StreaksService;
  friends: FriendsService;
  notifications: NotificationsService;
  profiles: ProfilesService;
}): {
  router: Router;
  service: GoalsService;
} {
  const service = createGoalsService({
    repository: createGoalsRepository(db),
    streaks,
    friends,
    notifications,
    profiles,
  });
  const router = createGoalsRouter(createGoalsController(service));
  return { router, service };
}
