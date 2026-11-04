import { z } from 'zod';

export const userIdParamsSchema = z.object({ userId: z.uuid() });
export const searchQuerySchema = z.object({ q: z.string().min(3) });
export const requestBodySchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Invalid username'),
});
