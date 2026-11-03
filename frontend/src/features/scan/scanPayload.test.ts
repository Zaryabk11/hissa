import { describe, expect, it } from 'vitest';
import { isNoPlateResult, mealPayload, reviewItemsFromScan, stepQty } from './scanPayload';

describe('scan to saved meal', () => {
  it('recognizes the backend unknown sentinel as a no-plate result', () => {
    expect(isNoPlateResult([{ dish: 'unknown', name: null, unit: null, portion: 0, confidence: 0, needsConfirmation: true }])).toBe(true);
    expect(isNoPlateResult([{ dish: 'roti', name: 'Roti', unit: 'roti', portion: 1, confidence: 0.9, needsConfirmation: false }])).toBe(false);
  });
  it('keeps the original prediction when the user corrects a dish and takes the planned portion', () => {
    const items = reviewItemsFromScan([{ dish: 'daal', name: 'Daal', unit: 'katori', portion: 1, confidence: 0.4, needsConfirmation: true }]);
    items[0]!.dishId = 'haleem';
    items[0]!.confirmed = true;
    const result = mealPayload(items, [{ slug: 'haleem', units: 0.5 }]);
    expect(result.items).toEqual([{ predictedDish: 'daal', predictedPortion: 1, confirmedDish: 'haleem', confirmedPortion: 0.5, confidence: 0.4 }]);
  });

  it('keeps removed predictions and skips an unknown item until it has a catalog dish', () => {
    const items = reviewItemsFromScan([{ dish: 'roti', name: 'Roti', unit: 'roti', portion: 2, confidence: 0.9, needsConfirmation: false }]);
    items[0]!.removed = true;
    expect(mealPayload(items).items).toEqual([{ predictedDish: 'roti', predictedPortion: 2, confirmedDish: null, confirmedPortion: null, confidence: 0.9 }]);
  });

  it('assigns separate planned portions to repeated dishes', () => {
    const items = reviewItemsFromScan([
      { dish: 'roti', name: 'Roti', unit: 'roti', portion: 2, confidence: 0.9, needsConfirmation: false },
      { dish: 'roti', name: 'Roti', unit: 'roti', portion: 1, confidence: 0.9, needsConfirmation: false },
    ]);
    expect(mealPayload(items, [{ slug: 'roti', units: 1 }, { slug: 'roti', units: 0.5 }]).items.map((i) => i.confirmedPortion)).toEqual([1, 0.5]);
  });
});

describe('portion stepping', () => {
  it('steps half a unit for katori, bowl and plate, one for the rest', () => {
    expect(stepQty(1, 'katori', 1)).toBe(1.5);
    expect(stepQty(1, 'plate', -1)).toBe(0.5);
    expect(stepQty(2, 'roti', 1)).toBe(3);
  });
  it('never drops below one step or above 20', () => {
    expect(stepQty(0.5, 'bowl', -1)).toBe(0.5);
    expect(stepQty(1, 'piece', -1)).toBe(1);
    expect(stepQty(20, 'roti', 1)).toBe(20);
  });
});
