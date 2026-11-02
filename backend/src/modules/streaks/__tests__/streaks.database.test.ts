import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Optional real PostgreSQL checks. Use only a disposable container initialized
// with the repository migrations and Supabase auth roles/schema.
// HISSA_TEST_POSTGRES_CONTAINER=hissa-claude-t3 npm test -w backend -- streaks.database
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const user = '00000000-0000-0000-0000-000000000011';
const dish = '00000000-0000-0000-0000-0000000000d1';

async function sql(statement: string): Promise<string> {
  const { stdout } = await execute('docker', [
    'exec',
    container,
    'psql',
    '-U',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-Atc',
    statement,
  ]);
  return stdout.trim();
}
async function ownDays(day: string): Promise<string> {
  const out = await sql(
    `set role service_role; select public.buddy_status_operation('${user}','status','${day}')::jsonb->'ownDays';`,
  );
  return out.split('\n').pop() ?? ''; // psql also prints the SET tag
}

describe.skipIf(!container)('streak repair counts only validated saves', () => {
  beforeAll(async () => {
    await sql(`insert into auth.users(id) values ('${user}') on conflict do nothing;`);
    await sql(
      `insert into public.dishes(id,slug,name,category,unit,grams_per_unit,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,source,basis,unit_basis)
       values ('${dish}','test-roti','Roti','roti','roti',40,300,9,50,5,'khan2019','lab','derived') on conflict do nothing;`,
    );
  });
  beforeEach(async () => {
    await sql('truncate public.meals, public.streak_days cascade');
  });

  it('counts a meal saved through the service role', async () => {
    await sql(`insert into public.meals(id,user_id,eaten_at) values
      ('00000000-0000-0000-0000-0000000000a1','${user}','2026-11-02T08:00:00+05:00');
      insert into public.meal_items(meal_id,confirmed_dish_id,confirmed_portion) values
      ('00000000-0000-0000-0000-0000000000a1','${dish}',2);`);
    expect(await ownDays('2026-11-02')).toContain('2026-11-02');
  });

  it('blocks direct-client meal and item writes, so partial meals cannot create streak marks', async () => {
    // Temporary grants model Supabase's default table grants, so RLS itself is exercised.
    const attempt = (statement: string) =>
      sql(`begin;
        grant usage on schema auth to authenticated;
        grant select, insert, update, delete on public.meals, public.meal_items to authenticated;
        set role authenticated;
        set request.jwt.claim.sub = '${user}';
        ${statement};
        rollback;`);
    await expect(
      attempt(
        `insert into public.meals(user_id,eaten_at) values ('${user}','2026-11-02T08:00:00+05:00')`,
      ),
    ).rejects.toThrow();
    await sql(`insert into public.meals(id,user_id) values
      ('00000000-0000-0000-0000-0000000000a2','${user}')`);
    await expect(
      attempt(
        `insert into public.meal_items(meal_id,confirmed_dish_id) values ('00000000-0000-0000-0000-0000000000a2','${dish}')`,
      ),
    ).rejects.toThrow();
    expect(await ownDays('2026-11-30')).toBe('[]');
  });
});
