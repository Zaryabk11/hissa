import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { NotificationsService } from './notifications.service';

export function createNotificationsController(service: NotificationsService) {
  return {
    async list(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.list(req.userId));
    },
    async markRead(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      await service.markAllRead(req.userId);
      res.status(204).end();
    },
  };
}
export type NotificationsController = ReturnType<typeof createNotificationsController>;
