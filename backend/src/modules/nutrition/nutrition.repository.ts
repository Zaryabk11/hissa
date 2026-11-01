import type { Db } from '../../shared/db';
import type { Dish } from './nutrition.types';

const COLUMNS =
  'id, slug, name, category, unit, grams_per_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source, basis, unit_basis';

interface DishRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  unit: Dish['unit'];
  grams_per_unit: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: Dish['source'];
  basis: Dish['basis'];
  unit_basis: Dish['unitBasis'];
}

const toDish = (r: DishRow): Dish => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  unit: r.unit,
  gramsPerUnit: r.grams_per_unit,
  kcalPer100g: r.kcal_per_100g,
  proteinPer100g: r.protein_per_100g,
  carbsPer100g: r.carbs_per_100g,
  fatPer100g: r.fat_per_100g,
  source: r.source,
  basis: r.basis,
  unitBasis: r.unit_basis,
});

// Supabase data access for the dish catalog (shared reference data, not user-owned). No business rules here.
export function createNutritionRepository(db: Db) {
  return {
    async listDishes(): Promise<Dish[]> {
      const { data, error } = await db.from('dishes').select(COLUMNS).order('name');
      if (error) throw error;
      return (data as DishRow[]).map(toDish);
    },

    async findDishBySlug(slug: string): Promise<Dish | null> {
      const { data, error } = await db
        .from('dishes')
        .select(COLUMNS)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data ? toDish(data as DishRow) : null;
    },
  };
}

export type NutritionRepository = ReturnType<typeof createNutritionRepository>;
