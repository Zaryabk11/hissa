import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { FeelService } from './feel.service';
import type { CheckinInput } from './feel.types';

export function createFeelController(service: FeelService) {
  return {
    async getDue(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.getDue(req.userId));
    },
    async submitCheckin(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.status(201).json(await service.submitCheckin(req.userId, req.body as CheckinInput));
    },
  };
}
export type FeelController = ReturnType<typeof createFeelController>;
