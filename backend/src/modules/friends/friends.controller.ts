import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { FriendsService } from './friends.service';

// Maps HTTP to friends service calls. Identity comes only from req.userId.
export function createFriendsController(service: FriendsService) {
  const uid = (req: Request): string => {
    if (!req.userId) throw new UnauthorizedError();
    return req.userId;
  };
  const other = (req: Request) => req.params.userId as string;

  return {
    async overview(req: Request, res: Response): Promise<void> {
      res.json(await service.overview(uid(req)));
    },
    async search(req: Request, res: Response): Promise<void> {
      res.json(await service.search(uid(req), req.query.q as string));
    },
    async request(req: Request, res: Response): Promise<void> {
      await service.request(uid(req), (req.body as { username: string }).username);
      res.status(204).end();
    },
    async accept(req: Request, res: Response): Promise<void> {
      await service.respond(uid(req), other(req), 'accept');
      res.status(204).end();
    },
    async decline(req: Request, res: Response): Promise<void> {
      await service.respond(uid(req), other(req), 'decline');
      res.status(204).end();
    },
    async remove(req: Request, res: Response): Promise<void> {
      await service.remove(uid(req), other(req));
      res.status(204).end();
    },
    async nudge(req: Request, res: Response): Promise<void> {
      await service.nudge(uid(req), other(req));
      res.status(204).end();
    },
  };
}
export type FriendsController = ReturnType<typeof createFriendsController>;
