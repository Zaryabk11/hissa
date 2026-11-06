import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { SnapsService } from './snaps.service';
import type { ReportReason } from './snaps.types';

// Maps HTTP to snaps service calls. Identity comes only from req.userId.
export function createSnapsController(service: SnapsService) {
  const uid = (req: Request): string => {
    if (!req.userId) throw new UnauthorizedError();
    return req.userId;
  };

  return {
    async send(req: Request, res: Response): Promise<void> {
      const { mealId, image } = req.body as { mealId: string; image: string };
      res.status(201).json(await service.send(uid(req), { mealId, image }));
    },
    async inbox(req: Request, res: Response): Promise<void> {
      res.json(await service.inbox(uid(req)));
    },
    async open(req: Request, res: Response): Promise<void> {
      const out = await service.open(uid(req), req.params.id as string);
      res.set('Cache-Control', 'no-store').json(out);
    },
    async report(req: Request, res: Response): Promise<void> {
      const { reason } = req.body as { reason: ReportReason };
      await service.report(uid(req), req.params.id as string, reason);
      res.status(204).end();
    },
    async unsend(req: Request, res: Response): Promise<void> {
      await service.unsend(uid(req), req.params.id as string);
      res.status(204).end();
    },
  };
}
export type SnapsController = ReturnType<typeof createSnapsController>;
