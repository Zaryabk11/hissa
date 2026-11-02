import { z } from 'zod';

export const checkinBodySchema = z
  .object({
    mealId: z.uuid(),
    energy: z.enum(['low', 'okay', 'good']),
    stomach: z.enum(['heavy', 'fine', 'light']),
    symptom: z.enum(['bloated', 'upset', 'other', 'not_sure']).optional(),
  })
  .strict();
