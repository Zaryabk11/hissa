import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { StreaksService } from './streaks.service';

export function createStreaksController(service: StreaksService) {
  return {
    async getOwn(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json((await service.getStreaks([req.userId]))[req.userId]);
    },
  };
}
export type StreaksController = ReturnType<typeof createStreaksController>;
