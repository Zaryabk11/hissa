import { apiAuthed } from '../../../shared/api/client';
import type { Unit } from '../../nutrition/catalog';

export type ProteinType = 'beef' | 'mutton' | 'chicken' | 'fish' | 'egg' | 'veg';
export type RecipeCard = {
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
};
export type RecipeDetail = RecipeCard & {
  ingredients: { item: string; quantity: string }[];
  steps: string[];
  notForMe: boolean;
  avoided: boolean;
};

const path = (id: string) => `/api/recipes/${encodeURIComponent(id)}`;

export const getRecipes = () =>
  apiAuthed<{ recipes: RecipeCard[]; remainingCalories: number; isEstimate: true }>('/api/recipes');
export const getRecipe = (id: string) => apiAuthed<RecipeDetail>(path(id));
// Both answer 204 with no body.
export const markNotForMe = (id: string) => apiAuthed<void>(`${path(id)}/not-for-me`, { method: 'POST' });
export const undoNotForMe = (id: string) => apiAuthed<void>(`${path(id)}/not-for-me`, { method: 'DELETE' });
