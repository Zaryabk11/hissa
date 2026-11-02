import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { StreaksService } from './streaks.service';
function actor(req: Request): string {
  if (!req.userId) throw new UnauthorizedError();
  return req.userId;
}
export function createStreaksController(service: StreaksService) {
  return {
    async getStatus(req: Request, res: Response): Promise<void> {
      res.json(await service.getStatus(actor(req)));
    },
    async nudge(req: Request, res: Response): Promise<void> {
      await service.nudge(actor(req));
      res.sendStatus(204);
    },
    async ackNudge(req: Request, res: Response): Promise<void> {
      await service.ackNudge(actor(req));
      res.sendStatus(204);
    },
    async createInvite(req: Request, res: Response): Promise<void> {
      res.status(201).json(await service.createInvite(actor(req)));
    },
    async previewInvite(req: Request, res: Response): Promise<void> {
      res.json(await service.previewInvite(actor(req), req.params.code as string));
    },
    async acceptInvite(req: Request, res: Response): Promise<void> {
      await service.respondInvite(actor(req), req.params.code as string, 'accept');
      res.sendStatus(204);
    },
    async declineInvite(req: Request, res: Response): Promise<void> {
      await service.respondInvite(actor(req), req.params.code as string, 'decline');
      res.sendStatus(204);
    },
    async endPair(req: Request, res: Response): Promise<void> {
      await service.endPair(actor(req));
      res.sendStatus(204);
    },
  };
}
export type StreaksController = ReturnType<typeof createStreaksController>;
