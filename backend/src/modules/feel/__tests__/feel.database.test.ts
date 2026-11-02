import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Optional real PostgreSQL check. Use only a disposable container with Supabase-style
// roles (anon/authenticated/service_role, default table grants), an auth.users stub,
// auth.uid() reading request.jwt.claim.sub, and every repository migration applied.
// HISSA_TEST_POSTGRES_CONTAINER=hissa-claude-t5 npm test -w backend -- feel.database
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const user = '00000000-0000-0000-0000-000000000051';
const meal = '00000000-0000-0000-0000-0000000000b1';

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
const asOwner = (statement: string) =>
  sql(
    `begin; set role authenticated; set request.jwt.claim.sub = '${user}'; ${statement}; rollback;`,
  );

describe.skipIf(!container)('feel_checkins are written only by the backend', () => {
  beforeAll(async () => {
    await sql(`insert into auth.users(id) values ('${user}') on conflict do nothing;`);
  });
  beforeEach(async () => {
    await sql('truncate public.meals cascade');
    await sql(`insert into public.meals(id,user_id) values ('${meal}','${user}')`);
  });

  it('lets the service role insert and the owner read the check-in', async () => {
    await sql(`set role service_role; insert into public.feel_checkins(user_id,meal_id,energy,stomach)
      values ('${user}','${meal}','okay','fine')`);
    expect(await asOwner('select count(*) from public.feel_checkins')).toContain('1');
  });

  it('blocks a direct authenticated insert', async () => {
    await expect(
      asOwner(
        `insert into public.feel_checkins(user_id,meal_id,energy,stomach) values ('${user}','${meal}','okay','fine')`,
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('blocks a direct authenticated update and delete', async () => {
    await sql(`insert into public.feel_checkins(user_id,meal_id,energy,stomach)
      values ('${user}','${meal}','okay','fine')`);
    await expect(asOwner(`update public.feel_checkins set answer_id = 'forged'`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(asOwner('delete from public.feel_checkins')).rejects.toThrow(/permission denied/);
  });
});
