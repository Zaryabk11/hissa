import type { MealInput, ScanItem } from '../core/api';
import type { ReviewItem } from './store';

export const isNoPlateResult = (items: ScanItem[]): boolean =>
  items.length === 0 || (items.length === 1 && items[0]?.dish === 'unknown');

/** One tap of the portion +/- control: half a unit for katori, bowl and plate, a whole one otherwise; kept between one step and 20. */
export function stepQty(qty: number, unit: string, direction: 1 | -1): number {
  const step = ['katori', 'bowl', 'plate'].includes(unit) ? 0.5 : 1;
  return Math.min(20, Math.max(step, qty + direction * step));
}

export function reviewItemsFromScan(found: ScanItem[]): ReviewItem[] {
  return found.map((item, n) => ({
    id: `scan-${n}`,
    dishId: item.dish,
    qty: item.portion > 0 ? item.portion : 1,
    ask: item.needsConfirmation ? (item.dish === 'unknown' ? [] : [item.dish]) : undefined,
    confirmed: false,
    removed: false,
    predictedDish: item.dish === 'unknown' ? null : item.dish,
    predictedPortion: item.portion > 0 ? item.portion : null,
    confidence: item.confidence,
  }));
}

export function mealPayload(items: ReviewItem[], planned: { slug: string; units: number }[] = []): { items: MealInput[] } {
  let plannedIndex = 0;
  return {
    items: items.filter((item) => item.predictedDish || !item.removed).map((item) => {
      const units = item.removed ? null : (planned[plannedIndex++]?.units ?? item.qty);
      return {
        predictedDish: item.predictedDish,
        predictedPortion: item.predictedPortion,
        confirmedDish: item.removed ? null : item.dishId,
        confirmedPortion: units,
        confidence: item.confidence,
      };
    }),
  };
}
