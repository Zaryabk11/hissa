import { useSyncExternalStore } from 'react';
import type { Plan } from '../core/api';

export type Detected = {
  dishId: string;
  qty: number;
  /** Set when the recogniser is unsure: the dish ids to choose between. */
  ask?: string[];
};

export type ReviewItem = Detected & { id: string; confirmed: boolean; removed: boolean; avoided: boolean; predictedDish: string | null; predictedPortion: number | null; confidence: number | null };

type ScanState = { photoUri: string | null; image: string | null; mimeType: string; items: ReviewItem[]; plan: Plan | null; manualReason: string | null };

let state: ScanState = { photoUri: null, image: null, mimeType: 'image/jpeg', items: [], plan: null, manualReason: null };
let nextId = 1;
const listeners = new Set<() => void>();

const set = (patch: Partial<ScanState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const newItem = (d: Detected): ReviewItem => ({ ...d, id: `i${nextId++}`, confirmed: false, removed: false, avoided: false, predictedDish: null, predictedPortion: null, confidence: null });

export const startScan = (photoUri: string, image: string | null = null, mimeType = 'image/jpeg') => set({ photoUri, image, mimeType, items: [], plan: null, manualReason: null });
export const setItems = (items: ReviewItem[]) => set({ items });
export const setPlan = (plan: Plan | null) => set({ plan });
export const setManualReason = (manualReason: string | null) => set({ manualReason });
export const patchItem = (id: string, patch: Partial<ReviewItem>) =>
  set({ items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
export const removeItem = (id: string) => set({ items: state.items.filter((i) => i.id !== id) });
export const getScan = () => state;

export function useScan(): ScanState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
