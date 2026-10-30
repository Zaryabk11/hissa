import { Router } from 'express';
import type { ScanController } from './scan.controller';

export function createScanRouter(controller: ScanController): Router {
  const router = Router();
  router.get('/', controller.detectDishes);
  return router;
}
