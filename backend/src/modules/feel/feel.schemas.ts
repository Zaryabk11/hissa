import { z } from 'zod';

export const checkinBodySchema = z
  .object({
    mealId: z.uuid(),
    energy: z.enum(['low', 'okay', 'good']),
    stomach: z.enum(['heavy', 'fine', 'light']),
    symptom: z.enum(['bloated', 'upset', 'other', 'not_sure']).optional(),
    // The optional follow-up answer: both fields or neither. Only pre_existing is storable.
    questionType: z.literal('pre_existing').optional(),
    answerId: z.enum(['yes', 'no', 'not_sure']).optional(),
  })
  .strict()
  .refine((b) => (b.questionType === undefined) === (b.answerId === undefined), {
    message: 'Send questionType and answerId together.',
  });

export const questionParamsSchema = z.object({ mealId: z.uuid() });

export const experimentBodySchema = z
  .object({
    patternKey: z.string().min(1).max(120),
    action: z.enum(['smaller_portion', 'different_side', 'observe_again']),
  })
  .strict();
export const experimentParamsSchema = z.object({ id: z.uuid() });
export const triedBodySchema = z.object({ mealId: z.uuid() }).strict();
