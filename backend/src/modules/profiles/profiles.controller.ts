import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { ProfileBody } from './profiles.schemas';
import type { ProfilesService } from './profiles.service';

// Maps HTTP to profiles service calls. No business logic.
export function createProfilesController(service: ProfilesService) {
  return {
    async getProfile(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.getProfile(req.userId));
    },

    async putProfile(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.upsertProfile(req.userId, req.body as ProfileBody));
    },
  };
}

export type ProfilesController = ReturnType<typeof createProfilesController>;
