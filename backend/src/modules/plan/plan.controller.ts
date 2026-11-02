import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { PlanBody } from './plan.schemas';
import type { PlanService } from './plan.service';

// Maps HTTP to plan service calls. No business logic.
export function createPlanController(service: PlanService) {
  return {
    async buildPlan(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.buildPlan(req.userId, (req.body as PlanBody).items));
    },
  };
}

export type PlanController = ReturnType<typeof createPlanController>;
