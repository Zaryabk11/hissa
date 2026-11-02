import { z } from 'zod';

// No dailyCalorieBudget on purpose: it is computed server-side and any client value is stripped.
export const profileBodySchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  goal: z.enum(['lose', 'maintain']),
  sex: z.enum(['male', 'female']),
  age: z.number().int().min(10).max(120),
  heightCm: z.number().positive().max(300),
  weightKg: z.number().positive().max(500),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active']),
});

export type ProfileBody = z.infer<typeof profileBodySchema>;
