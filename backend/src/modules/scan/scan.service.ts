import { pktDay } from '../../shared/time/pkt';
import type { NutritionService } from '../nutrition';
import { GeminiUnavailableError, type GeminiClient } from './gemini.client';
import { resizePhoto } from './resize-photo';
import type { ScanRepository } from './scan.repository';
import type { ScanItem, ScanResult } from './scan.types';

export const CONFIDENCE_FLOOR = 0.6;
const MAX_PORTION = 20;

interface ScanDeps {
  repository: Pick<ScanRepository, 'countScansForDay' | 'recordScan'>;
  gemini: GeminiClient;
  nutrition: Pick<NutritionService, 'listCatalog'>;
  dailyCap: number;
  now?: () => Date;
}

const NOTHING_FOUND: ScanItem = {
  dish: 'unknown',
  name: null,
  unit: null,
  portion: 0,
  confidence: 0,
  needsConfirmation: true,
};

// Business rules for scan: daily cap, resize, Gemini detection, confirmation flags.
export function createScanService({
  repository,
  gemini,
  nutrition,
  dailyCap,
  now = () => new Date(),
}: ScanDeps) {
  return {
    async scanPhoto(
      userId: string,
      input: { image: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' },
    ): Promise<ScanResult> {
      const day = pktDay(now());
      if ((await repository.countScansForDay(userId, day)) >= dailyCap) {
        return { mode: 'manual', reason: 'daily_cap' };
      }

      const photo = await resizePhoto(Buffer.from(input.image, 'base64'));
      // Read before recording so a catalog failure does not use up a scan.
      const catalog = await nutrition.listCatalog();
      // Recorded before calling Gemini so retries cannot get around the cap.
      await repository.recordScan(userId, day);

      let detected;
      try {
        detected = await gemini.detectDishes(
          photo,
          catalog.map(({ slug, unit }) => ({ slug, unit })),
        );
      } catch (err) {
        if (err instanceof GeminiUnavailableError)
          return { mode: 'manual', reason: 'gemini_unavailable' };
        throw err;
      }
      if (detected.length === 0) return { mode: 'detected', items: [NOTHING_FOUND] };

      const bySlug = new Map(catalog.map((d) => [d.slug, d]));
      const items = detected.map((d): ScanItem => {
        const dish = bySlug.get(d.dish);
        const portionOk = Number.isFinite(d.portion) && d.portion > 0 && d.portion <= MAX_PORTION;
        return {
          dish: dish ? dish.slug : 'unknown',
          name: dish?.name ?? null,
          unit: dish?.unit ?? null,
          portion: portionOk ? d.portion : 1,
          confidence: d.confidence,
          needsConfirmation: !dish || !portionOk || d.confidence < CONFIDENCE_FLOOR,
        };
      });
      return { mode: 'detected', items };
    },
  };
}

export type ScanService = ReturnType<typeof createScanService>;
