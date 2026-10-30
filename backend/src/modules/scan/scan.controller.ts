import type { Request, Response } from 'express';
import type { ScanService } from './scan.service';

// Maps HTTP to scan service calls. No business logic.
export function createScanController(service: ScanService) {
  return {
    async detectDishes(_req: Request, res: Response): Promise<void> {
      res.json(await service.detectDishes());
    },
  };
}

export type ScanController = ReturnType<typeof createScanController>;
