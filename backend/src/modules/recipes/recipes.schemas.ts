import { z } from 'zod';

export const recipeParamsSchema = z.object({ id: z.string().uuid() });
