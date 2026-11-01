import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { SaveMealBody } from './meals.schemas';
import type { MealsService } from './meals.service';

// Maps HTTP to meals service calls. No business logic.
export function createMealsController(service: MealsService) {
  return {
    async saveMeal(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.status(201).json(await service.saveMeal(req.userId, req.body as SaveMealBody));
    },

    async listToday(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.listToday(req.userId));
    },
  };
}

export type MealsController = ReturnType<typeof createMealsController>;
