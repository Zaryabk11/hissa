import type { Router } from 'express';
import type { Db } from '../../shared/db';
import type { ProfilesService } from '../profiles';
import { createNotificationsController } from './notifications.controller';
import { createNotificationsRepository } from './notifications.repository';
import { createNotificationsRouter } from './notifications.routes';
import { createNotificationsService, type NotificationsService } from './notifications.service';

export type { NotificationsService };
export type {
  GoalType,
  NewNotification,
  NotificationItem,
  NotificationKind,
} from './notifications.types';
export { formatGoalTitle } from './notifications.types';

// The only file other modules may import.
export function createNotificationsModule({
  db,
  profiles,
}: {
  db: Db;
  profiles: ProfilesService;
}): {
  router: Router;
  service: NotificationsService;
} {
  const service = createNotificationsService({
    repository: createNotificationsRepository(db),
    profiles,
  });
  const router = createNotificationsRouter(createNotificationsController(service));
  return { router, service };
}
