import type { Router } from 'express';
import type { Config } from '../../shared/config';
import type { Db } from '../../shared/db';
import { createScanController } from './scan.controller';
import { createGeminiClient } from './gemini.client';
import { createScanRepository } from './scan.repository';
import { createScanRouter } from './scan.routes';
import { createScanService, type ScanService } from './scan.service';

export type { ScanService };

// The only file other modules may import.
export function createScanModule({ db, config }: { db: Db; config: Config }): {
  router: Router;
  service: ScanService;
} {
  const service = createScanService({
    repository: createScanRepository(db),
    gemini: createGeminiClient({ apiKey: config.GEMINI_API_KEY, model: config.GEMINI_MODEL }),
  });
  const router = createScanRouter(createScanController(service));
  return { router, service };
}
