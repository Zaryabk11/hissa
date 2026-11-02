import { useSyncExternalStore } from 'react';
import type { Detected } from './mockRecognise';

export type ReviewItem = Detected & { id: string; confirmed: boolean; removed: boolean };

type ScanState = { photoUri: string | null; items: ReviewItem[]; noPlate: boolean };

let state: ScanState = { photoUri: null, items: [], noPlate: false };
let nextId = 1;
const listeners = new Set<() => void>();

const set = (patch: Partial<ScanState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const newItem = (d: Detected): ReviewItem => ({ ...d, id: `i${nextId++}`, confirmed: false, removed: false });

export const startScan = (photoUri: string) => set({ photoUri, items: [] });
/** Dev switch: the next recognitions find no plate (`/scan?mock=noplate`). */
export const setMockNoPlate = (noPlate: boolean) => set({ noPlate });
export const setItems = (items: ReviewItem[]) => set({ items });
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
