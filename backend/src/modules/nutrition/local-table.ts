import type { NutritionPerServing } from './nutrition.types';

// Fallback for dishes FatSecret lacks (karahi, nihari, ...), keyed by dish slug. Empty until the catalog lands.
const localTable: Record<string, NutritionPerServing> = {};

export function lookupLocal(slug: string): NutritionPerServing | undefined {
  return localTable[slug];
}
