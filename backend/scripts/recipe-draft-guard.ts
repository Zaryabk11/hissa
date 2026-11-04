import { z } from 'zod';

// Recipe text comes from Gemini; this is the safety net before a human reviews it.
const BANNED = /kcal|calorie|healthy|cure|allerg|diabet|safe|weight loss|doctor|medic/i;

const recipeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  dish: z.string(),
  minutes: z.number().int().min(5).max(240),
  servings: z.number().int().min(1).max(12),
  ingredients: z
    .array(z.object({ item: z.string().min(1), quantity: z.string().min(1) }))
    .min(3)
    .max(15),
  steps: z.array(z.string().min(1)).min(3).max(12),
  reviewed: z.literal(false),
});
export type RecipeDraft = z.infer<typeof recipeSchema>;

export function checkRecipeDraft(
  draft: unknown,
  catalogSlugs: Set<string>,
): { ok: true; recipe: RecipeDraft } | { ok: false; reason: string } {
  const parsed = recipeSchema.safeParse(draft);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, reason: `${i?.path.join('.')}: ${i?.message}` };
  }
  const recipe = parsed.data;
  if (!catalogSlugs.has(recipe.dish)) return { ok: false, reason: `unknown dish "${recipe.dish}"` };
  const banned = JSON.stringify(recipe).match(BANNED);
  if (banned) return { ok: false, reason: `banned word "${banned[0]}"` };
  return { ok: true, recipe };
}
