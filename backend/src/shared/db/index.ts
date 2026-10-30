import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from '../config';

export type Db = SupabaseClient;

// Service-role client: bypasses RLS, so services must scope every query to the authed user.
export function createDb(config: Config): Db {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
