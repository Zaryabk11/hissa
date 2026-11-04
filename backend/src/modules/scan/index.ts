import type { Router } from 'express';
import type { Config } from '../../shared/config';
import type { Db } from '../../shared/db';
import type { NutritionService } from '../nutrition';
import type { ProfilesService } from '../profiles';
import { createScanController } from './scan.controller';
import { createGeminiClient } from './gemini.client';
import { createScanRepository } from './scan.repository';
import { createScanRouter } from './scan.routes';
import { createScanService, type ScanService } from './scan.service';

export type { ScanService };

// The only file other modules may import.
export function createScanModule({
  db,
  config,
  nutrition,
  profiles,
}: {
  db: Db;
  config: Config;
  nutrition: NutritionService;
  profiles: ProfilesService;
}): {
  router: Router;
  service: ScanService;
} {
  const service = createScanService({
    repository: createScanRepository(db),
    nutrition,
    profiles,
    dailyCap: config.SCAN_DAILY_CAP,
    gemini: createGeminiClient({
      apiKey: config.GEMINI_API_KEY,
      model: config.GEMINI_MODEL,
      timeoutMs: config.GEMINI_TIMEOUT_MS,
    }),
  });
  const router = createScanRouter(createScanController(service));
  return { router, service };
}
