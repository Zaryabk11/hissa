import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { GoalsService } from './goals.service';
import type { GoalInput } from './goals.types';

// Maps HTTP to goals service calls. Identity comes only from req.userId.
export function createGoalsController(service: GoalsService) {
  const uid = (req: Request): string => {
    if (!req.userId) throw new UnauthorizedError();
    return req.userId;
  };

  return {
    async mine(req: Request, res: Response): Promise<void> {
      res.json(await service.getMine(uid(req)));
    },
    async create(req: Request, res: Response): Promise<void> {
      res.status(201).json(await service.create(uid(req), req.body as GoalInput));
    },
    async update(req: Request, res: Response): Promise<void> {
      res.json(await service.update(uid(req), req.body as { shared?: boolean; abandon?: boolean }));
    },
    async celebrations(req: Request, res: Response): Promise<void> {
      res.json(await service.celebrations(uid(req)));
    },
    async cheer(req: Request, res: Response): Promise<void> {
      await service.cheer(uid(req), req.params.id as string);
      res.status(204).end();
    },
  };
}
export type GoalsController = ReturnType<typeof createGoalsController>;
