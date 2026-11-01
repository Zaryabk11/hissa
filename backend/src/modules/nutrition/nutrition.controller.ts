import type { Request, Response } from 'express';
import type { NutritionService } from './nutrition.service';

// Maps HTTP to nutrition service calls. No business logic.
export function createNutritionController(service: NutritionService) {
  return {
    async getCatalog(_req: Request, res: Response): Promise<void> {
      res.json({ dishes: await service.listCatalog() });
    },
  };
}

export type NutritionController = ReturnType<typeof createNutritionController>;
