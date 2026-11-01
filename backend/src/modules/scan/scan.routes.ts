import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import type { ScanController } from './scan.controller';
import { scanBodySchema } from './scan.schemas';

export function createScanRouter(controller: ScanController): Router {
  const router = Router();
  router.post('/', validate('body', scanBodySchema), controller.scanPhoto);
  return router;
}
