import type { Unit } from '../nutrition';

export interface ScanItem {
  dish: string; // a catalog slug, or 'unknown'
  name: string | null;
  unit: Unit | null;
  portion: number;
  confidence: number;
  needsConfirmation: boolean;
  avoided: boolean;
}

export type ScanResult =
  | { mode: 'detected'; items: ScanItem[] }
  | { mode: 'manual'; reason: 'daily_cap' | 'gemini_unavailable' };
