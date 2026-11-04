import type { Db } from '../../shared/db';
import type { RecipeRow } from './recipes.types';

const COLUMNS = 'id, slug, title, minutes, servings, ingredients, steps, dishes(slug)';

// Supabase data access for recipes. Only reviewed recipes leave here; feedback is always per user.
export function createRecipesRepository(db: Db) {
  return {
    async listReviewed(): Promise<RecipeRow[]> {
      const { data, error } = await db.from('recipes').select(COLUMNS).eq('reviewed', true);
      if (error) throw error;
      return data as unknown as RecipeRow[];
    },

    async findReviewed(id: string): Promise<RecipeRow | null> {
      const { data, error } = await db
        .from('recipes')
        .select(COLUMNS)
        .eq('id', id)
        .eq('reviewed', true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as RecipeRow | null;
    },

    async listNotForMe(userId: string): Promise<string[]> {
      const { data, error } = await db
        .from('recipe_feedback')
        .select('recipe_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data as { recipe_id: string }[]).map((r) => r.recipe_id);
    },

    async addNotForMe(userId: string, recipeId: string): Promise<void> {
      const { error } = await db
        .from('recipe_feedback')
        .upsert(
          { user_id: userId, recipe_id: recipeId, verdict: 'not_for_me' },
          { onConflict: 'user_id,recipe_id', ignoreDuplicates: true },
        );
      if (error) throw error;
    },

    async removeNotForMe(userId: string, recipeId: string): Promise<void> {
      const { error } = await db
        .from('recipe_feedback')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId);
      if (error) throw error;
    },
  };
}

export type RecipesRepository = ReturnType<typeof createRecipesRepository>;
