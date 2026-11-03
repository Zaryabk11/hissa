import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Optional real PostgreSQL check, same disposable-container setup as feel.database.test.ts.
// HISSA_TEST_POSTGRES_CONTAINER=hissa-claude-t5 npm test -w backend -- experiments.database
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const user = '00000000-0000-0000-0000-000000000091';
const other = '00000000-0000-0000-0000-000000000092';
const meal = '00000000-0000-0000-0000-0000000000c1';
const otherMeal = '00000000-0000-0000-0000-0000000000c2';

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
const insert = (status = 'active', action = 'smaller_portion', mealId = 'null') =>
  `insert into public.user_experiments(user_id,pattern_key,action,status,tried_at,tried_meal_id)
   values ('${user}','category:rice:heavy','${action}','${status}',
   ${status === 'tried' ? 'now()' : 'null'},${mealId === 'null' ? 'null' : `'${mealId}'`})`;

describe.skipIf(!container)('user_experiments are private and written only by the backend', () => {
  beforeAll(async () => {
    await sql(`insert into auth.users(id) values ('${user}'),('${other}') on conflict do nothing`);
  });
  beforeEach(async () => {
    await sql('truncate public.meals cascade');
    await sql('truncate public.user_experiments');
    await sql(
      `insert into public.meals(id,user_id) values ('${meal}','${user}'),('${otherMeal}','${other}')`,
    );
  });

  it('lets the owner read only their own experiment', async () => {
    await sql(insert());
    await sql(
      `insert into public.user_experiments(user_id,pattern_key,action) values ('${other}','dish:raita:heavy','observe_again')`,
    );
    expect(await asOwner('select count(*) from public.user_experiments')).toContain('1');
  });

  it('blocks direct authenticated insert, update and delete', async () => {
    await expect(asOwner(insert())).rejects.toThrow(/permission denied/);
    await sql(insert());
    await expect(asOwner(`update public.user_experiments set status = 'tried'`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(asOwner('delete from public.user_experiments')).rejects.toThrow(
      /permission denied/,
    );
  });

  it('allows at most one active experiment per user, but any number of tried ones', async () => {
    await sql(insert());
    await expect(sql(insert())).rejects.toThrow(/user_experiments_one_active_idx/);
    await sql(insert('tried', 'observe_again', meal));
    await sql(insert('tried', 'different_side', meal));
  });

  it('rejects an unknown action or status', async () => {
    await expect(sql(insert('active', 'skip_meals'))).rejects.toThrow(/check constraint/);
    await expect(sql(insert('done'))).rejects.toThrow(/check constraint/);
  });

  it('refuses a tried meal that belongs to another user', async () => {
    await expect(sql(insert('tried', 'observe_again', otherMeal))).rejects.toThrow(/foreign key/);
  });
});
