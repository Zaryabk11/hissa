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
    z.string().min(1).default('gemini-flash-lite-latest'),
  ),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  // Optional demo-only account id: the only user whose weekly card may be labelled sample data.
  DEMO_USER_ID: z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional()),
  // Snaps feature flag: only the exact string 'true' turns it on.
  SNAPS_ENABLED: z.preprocess((v) => v === 'true', z.boolean()),
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
