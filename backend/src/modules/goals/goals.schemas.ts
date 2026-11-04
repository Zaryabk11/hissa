import { z } from 'zod';

const shared = z.boolean().default(false);
const streak = z.strictObject({
  type: z.literal('streak'),
  target: z.number().int().min(2).max(365),
  shared,
});
const window = z.strictObject({
  type: z.literal('window'),
  windowDays: z.number().int().min(2).max(90),
  target: z.number().int().min(1),
  shared,
});

export const createBodySchema = z
  .discriminatedUnion('type', [streak, window])
  .refine((g) => g.type !== 'window' || g.target <= g.windowDays, {
    message: 'target cannot exceed windowDays',
  });
export const updateBodySchema = z
  .strictObject({ shared: z.boolean().optional(), abandon: z.literal(true).optional() })
  .refine((b) => b.shared !== undefined || b.abandon, { message: 'Nothing to update' });
export const goalIdParamsSchema = z.object({ id: z.uuid() });
