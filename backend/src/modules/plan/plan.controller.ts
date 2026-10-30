import type { Request, Response } from 'express';
import type { PlanService } from './plan.service';

// Maps HTTP to plan service calls. No business logic.
export function createPlanController(service: PlanService) {
  return {
    async buildPlan(_req: Request, res: Response): Promise<void> {
      res.json(await service.buildPlan());
    },
  };
}

export type PlanController = ReturnType<typeof createPlanController>;
