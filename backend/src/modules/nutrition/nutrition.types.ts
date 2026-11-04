export type Unit = 'roti' | 'katori' | 'plate' | 'piece' | 'glass' | 'bowl';

export type ProteinType = 'beef' | 'mutton' | 'chicken' | 'fish' | 'egg' | 'veg';

export interface Dish {
  id: string;
  slug: string;
  name: string;
  category: string;
  unit: Unit;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: 'khan2019' | 'farooq2026' | 'indb';
  basis: 'lab' | 'calculated';
  unitBasis: 'derived' | 'assumed';
  proteinType: ProteinType | null;
}

export interface PortionNutrition {
  slug: string;
  units: number;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: Dish['source'];
  basis: Dish['basis'];
  unitBasis: Dish['unitBasis'];
  isEstimate: true;
}
