import type { Request, Response } from 'express';
import type { StreaksService } from './streaks.service';

// Maps HTTP to streaks service calls. No business logic.
export function createStreaksController(service: StreaksService) {
  return {
    async getStreak(_req: Request, res: Response): Promise<void> {
      res.json(await service.getStreak());
    },
  };
}

export type StreaksController = ReturnType<typeof createStreaksController>;
