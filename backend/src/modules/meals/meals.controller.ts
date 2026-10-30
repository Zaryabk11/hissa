import type { Request, Response } from 'express';
import type { MealsService } from './meals.service';

// Maps HTTP to meals service calls. No business logic.
export function createMealsController(service: MealsService) {
  return {
    async saveMeal(_req: Request, res: Response): Promise<void> {
      res.json(await service.saveMeal());
    },
  };
}

export type MealsController = ReturnType<typeof createMealsController>;
