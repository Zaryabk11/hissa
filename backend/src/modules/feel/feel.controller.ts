import type { Request, Response } from 'express';
import type { FeelService } from './feel.service';

// Maps HTTP to feel service calls. No business logic.
export function createFeelController(service: FeelService) {
  return {
    async submitCheckin(_req: Request, res: Response): Promise<void> {
      res.json(await service.submitCheckin());
    },
  };
}

export type FeelController = ReturnType<typeof createFeelController>;
