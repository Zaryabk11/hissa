// MOCK recognition: no backend, no AI. Real recognition will name dishes from the catalog only (never calories).
export type Detected = {
  dishId: string;
  qty: number;
  /** Set when the recogniser is unsure: the dish ids to choose between. */
  ask?: string[];
};

export const MOCK_DELAY_MS = 2000;

const FOUND: Detected[] = [
  { dishId: 'chicken-karahi', qty: 1 },
  { dishId: 'roti', qty: 2 },
  { dishId: 'daal', qty: 1, ask: ['daal', 'haleem'] },
  { dishId: 'raita', qty: 1 },
];

/** Resolves after about 2 seconds. `noPlate` makes it find nothing (the "couldn't see a plate" path). */
export function mockRecognise(_photoUri: string, noPlate: boolean): Promise<Detected[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(noPlate ? [] : FOUND.map((d) => ({ ...d }))), MOCK_DELAY_MS);
  });
}
