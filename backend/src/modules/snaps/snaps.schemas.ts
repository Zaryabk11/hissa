import { z } from 'zod';
import { imageBodySchema } from '../../shared/image';

export const sendBodySchema = imageBodySchema.extend({ mealId: z.uuid() });
export const snapIdParamsSchema = z.object({ id: z.uuid() });
