import type { ProteinType, Unit } from '../nutrition';

export interface RecipeCard {
  id: string;
  slug: string;
  title: string;
  dish: string;
  dishName: string;
  proteinType: ProteinType | null;
  minutes: number;
  servings: number;
  unit: Unit;
  kcalPerUnit: number;
  isEstimate: true;
}

export interface RecipeDetail extends RecipeCard {
  ingredients: { item: string; quantity: string }[];
  steps: string[];
  notForMe: boolean;
  avoided: boolean;
}

// A reviewed row of public.recipes with its dish slug joined.
export interface RecipeRow {
  id: string;
  slug: string;
  title: string;
  minutes: number;
  servings: number;
  ingredients: { item: string; quantity: string }[];
  steps: string[];
  dishes: { slug: string };
}

// The slice of the feel module's weekly card that ranking reads. Declared here so recipes never
// imports feel (experiments stay out of other modules; see feel/__tests__/experiments.privacy.test.ts).
export interface PatternSource {
  getWeeklyPattern(userId: string): Promise<{
    state: string;
    pattern: {
      kind: 'category' | 'dish';
      subject: string;
      outcome: 'heavy' | 'good_energy';
    } | null;
  }>;
}
