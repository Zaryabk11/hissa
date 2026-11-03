import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { FeelService } from './feel.service';
import type { CheckinInput } from './feel.types';

export function createFeelController(service: FeelService) {
  return {
    async getQuestion(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.getQuestion(req.userId, String(req.params.mealId)));
    },
    async getWeeklyPattern(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.getWeeklyPattern(req.userId));
    },
    async getDue(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      // ?skip=id,id lets the app step past meals the user skipped on this screen.
      const skip = typeof req.query.skip === 'string' ? req.query.skip.split(',') : [];
      res.json(await service.getDue(req.userId, new Date(), skip));
    },
    async submitCheckin(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.status(201).json(await service.submitCheckin(req.userId, req.body as CheckinInput));
    },
  };
}
export type FeelController = ReturnType<typeof createFeelController>;
