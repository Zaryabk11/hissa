import { Router } from 'express';
import type { NotificationsController } from './notifications.controller';

export function createNotificationsRouter(controller: NotificationsController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/read', controller.markRead);
  return router;
}
