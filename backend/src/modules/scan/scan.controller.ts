import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import type { ScanBody } from './scan.schemas';
import type { ScanService } from './scan.service';

// Maps HTTP to scan service calls. No business logic.
export function createScanController(service: ScanService) {
  return {
    async scanPhoto(req: Request, res: Response): Promise<void> {
      if (!req.userId) throw new UnauthorizedError();
      res.json(await service.scanPhoto(req.userId, req.body as ScanBody));
    },
  };
}

export type ScanController = ReturnType<typeof createScanController>;
