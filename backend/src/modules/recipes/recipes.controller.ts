import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { RecipesService } from './recipes.service';

// Maps HTTP to recipes service calls. No business logic.
export function createRecipesController(service: RecipesService) {
  const userId = (req: Request): string => {
    if (!req.userId) throw new UnauthorizedError();
    return req.userId;
  };
  const id = (req: Request) => req.params.id as string;

  return {
    async list(req: Request, res: Response): Promise<void> {
      res.json(await service.list(userId(req)));
    },
    async detail(req: Request, res: Response): Promise<void> {
      res.json(await service.detail(userId(req), id(req)));
    },
    async markNotForMe(req: Request, res: Response): Promise<void> {
      await service.markNotForMe(userId(req), id(req));
      res.status(204).end();
    },
    async undoNotForMe(req: Request, res: Response): Promise<void> {
      await service.undoNotForMe(userId(req), id(req));
      res.status(204).end();
    },
  };
}

export type RecipesController = ReturnType<typeof createRecipesController>;
