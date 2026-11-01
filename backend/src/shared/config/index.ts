import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  // An empty value (a blank line in .env) falls back to the default.
  GEMINI_MODEL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).default('gemini-3.1-flash-lite'),
  ),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  SCAN_DAILY_CAP: z.coerce.number().int().positive().default(10),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment: ${fields}`);
  }
  return result.data;
}
