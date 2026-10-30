import { NotImplementedError } from '../../shared/errors';
import type { GeminiClient } from './gemini.client';
import type { ScanRepository } from './scan.repository';

interface ScanDeps {
  repository: ScanRepository;
  gemini: GeminiClient;
}

// Business rules for scan.
export function createScanService(_deps: ScanDeps) {
  return {
    async detectDishes(): Promise<never> {
      throw new NotImplementedError('scan.detectDishes');
    },
  };
}

export type ScanService = ReturnType<typeof createScanService>;
