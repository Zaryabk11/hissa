import { z } from 'zod';
import { imageBodySchema } from '../../shared/image';

export const sendBodySchema = imageBodySchema.extend({ mealId: z.uuid() });
export const snapIdParamsSchema = z.object({ id: z.uuid() });
export const reportBodySchema = z.object({
  reason: z.enum(['spam', 'inappropriate_photo', 'harassment', 'other']),
});
