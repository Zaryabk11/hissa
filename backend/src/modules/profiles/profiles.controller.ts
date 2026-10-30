import type { Request, Response } from 'express';
import type { ProfilesService } from './profiles.service';

// Maps HTTP to profiles service calls. No business logic.
export function createProfilesController(service: ProfilesService) {
  return {
    async getProfile(_req: Request, res: Response): Promise<void> {
      res.json(await service.getProfile());
    },
  };
}

export type ProfilesController = ReturnType<typeof createProfilesController>;
