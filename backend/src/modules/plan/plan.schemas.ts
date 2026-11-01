import { z } from 'zod';

export const planBodySchema = z.object({
  items: z
    .array(z.object({ slug: z.string().min(1).max(80), units: z.number().gt(0).lte(20) }))
    .min(1)
    .max(10),
});

export type PlanBody = z.infer<typeof planBodySchema>;
