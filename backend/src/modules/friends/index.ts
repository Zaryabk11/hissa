import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { NotificationsService } from '../notifications';
import type { ProfilesService } from '../profiles';
import type { StreaksService } from '../streaks';
import { createFriendsController } from './friends.controller';
import { createFriendsRepository } from './friends.repository';
import { createFriendsRouter } from './friends.routes';
import { createFriendsService, type FriendsService } from './friends.service';

export type { FriendsService };
export type { FriendRow, FriendsOverview } from './friends.types';

// The only file other modules may import.
export function createFriendsModule({
  db,
  streaks,
  profiles,
  notifications,
}: {
  db: Db;
  streaks: StreaksService;
  profiles: ProfilesService;
  notifications: NotificationsService;
}): {
  router: Router;
  service: FriendsService;
} {
  const service = createFriendsService({
    repository: createFriendsRepository(db),
    streaks,
    profiles,
    notifications,
  });
  const router = createFriendsRouter(createFriendsController(service));
  return { router, service };
}
