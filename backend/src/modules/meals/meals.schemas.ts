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
  );

export const saveMealBodySchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
});

export type SaveMealBody = z.infer<typeof saveMealBodySchema>;
