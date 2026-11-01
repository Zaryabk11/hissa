import { pktDay } from '../../shared/time/pkt';
import type { Dish, NutritionService } from '../nutrition';
import { GeminiUnavailableError, type GeminiClient } from './gemini.client';
import { resizePhoto } from './resize-photo';
import type { ScanBody } from './scan.schemas';
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
      input: Pick<ScanBody, 'image' | 'mimeType'>,
    ): Promise<ScanResult> {
      const day = pktDay(now());
      if ((await repository.countScansForDay(userId, day)) >= dailyCap) {
        return { mode: 'manual', reason: 'daily_cap' };
      }

      const photo = await resizePhoto(Buffer.from(input.image, 'base64'));
      // Read before recording so a catalog failure does not use up a scan.
      const catalog = await nutrition.listCatalog();
      // Recorded before calling Gemini so retries cannot get around the cap. Count again after the
      // insert: parallel requests can all pass the pre-check, but only `dailyCap` of them end up
      // at or under the cap. The over-cap row stays, which is acceptable.
      await repository.recordScan(userId, day);
      if ((await repository.countScansForDay(userId, day)) > dailyCap) {
        return { mode: 'manual', reason: 'daily_cap' };
      }

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

      // Unknown items are dropped when anything was recognised; otherwise one unknown item remains.
      const bySlug = new Map(catalog.map((d) => [d.slug, d]));
      const found = detected.filter((d) => bySlug.has(d.dish));
      if (found.length === 0) return { mode: 'detected', items: [NOTHING_FOUND] };

      const items = found.map((d): ScanItem => {
        const dish = bySlug.get(d.dish) as Dish;
        const portionOk = Number.isFinite(d.portion) && d.portion > 0 && d.portion <= MAX_PORTION;
        return {
          dish: dish.slug,
          name: dish.name,
          unit: dish.unit,
          portion: portionOk ? d.portion : 1,
          confidence: d.confidence,
          needsConfirmation: !portionOk || d.confidence < CONFIDENCE_FLOOR,
        };
      });
      return { mode: 'detected', items };
    },
  };
}

export type ScanService = ReturnType<typeof createScanService>;
