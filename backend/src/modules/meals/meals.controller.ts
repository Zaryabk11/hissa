import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { SaveMealBody, UpdateMealBody } from './meals.schemas';
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

    async week(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.weekTotals(req.userId));
    },

    async history(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      const days = typeof req.query.days === 'string' ? Number(req.query.days) : undefined;
      res.json(await service.history(req.userId, days));
    },

    async getMeal(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json({ meal: await service.getMeal(req.userId, String(req.params.id)) });
    },

    async updateMeal(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      const meal = await service.updateMeal(
        req.userId,
        String(req.params.id),
        req.body as UpdateMealBody,
      );
      res.json({ meal });
    },

    async deleteMeal(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      await service.deleteMeal(req.userId, String(req.params.id));
      res.status(204).end();
    },
  };
}

export type MealsController = ReturnType<typeof createMealsController>;
