import { z } from 'zod';

const dish = z.string().min(1).max(80).nullable();
const portion = z.number().finite().nullable();

const itemSchema = z
  .object({
    predictedDish: dish,
    predictedPortion: portion,
    confirmedDish: dish,
    confirmedPortion: portion,
    confidence: z.number().min(0).max(1).nullable(),
  })
  .refine(
    (i) => (i.predictedDish !== null && i.predictedDish !== 'unknown') || i.confirmedDish !== null,
    {
      message: 'Each item needs a predicted or a confirmed dish',
    },
  )
  .refine(
    (i) =>
      i.confirmedDish === null ||
      (i.confirmedPortion !== null && i.confirmedPortion > 0 && i.confirmedPortion <= 20),
    { message: 'confirmedPortion must be greater than 0 and at most 20' },
  )
  .refine((i) => i.confirmedDish !== null || i.confirmedPortion === null, {
    message: 'confirmedPortion must be null when confirmedDish is null',
  })
  .refine(
    (i) => i.predictedPortion === null || (i.predictedPortion >= 0 && i.predictedPortion <= 20),
    {
      message: 'predictedPortion must be between 0 and 20',
    },
  );

export const saveMealBodySchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
});

export type SaveMealBody = z.infer<typeof saveMealBodySchema>;

// PATCH replaces the items with the same shape and rules as a save.
export const updateMealBodySchema = saveMealBodySchema;
export type UpdateMealBody = SaveMealBody;

export const mealParamsSchema = z.object({ id: z.guid() });

// Whole days only, 1 to 60. Optional: the service defaults it.
export const historyQuerySchema = z.object({
  days: z
    .string()
    .regex(/^\d{1,2}$/)
    .refine((d) => Number(d) >= 1 && Number(d) <= 60, { message: 'days must be 1 to 60' })
    .optional(),
});
