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

export const usernameSchema = z
  .string()
  .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3-20 lowercase letters, digits or underscores');
export const usernameBodySchema = z.object({ username: usernameSchema });

export type ProfileBody = z.infer<typeof profileBodySchema>;
