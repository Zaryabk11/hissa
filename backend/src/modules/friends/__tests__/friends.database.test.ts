import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

// Optional real PostgreSQL check of migration 20261104000000. Use a disposable container
// initialized with the Supabase roles/auth stub and every migration up to 20261103000100
// applied; this test replays the new migration inside its own transaction and rolls back.
// HISSA_TEST_POSTGRES_CONTAINER=hissa-claude-t3 npm test -w backend -- friends.database
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const migrationSql = readFileSync(
  join(
    __dirname,
    '../../../../../database/supabase/migrations/20261104000000_friends_goals_notifications.sql',
  ),
  'utf8',
);
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [a, b, c, d, dish, meal1, meal2] = [11, 12, 13, 14, 21, 31, 32].map(id);

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

describe.skipIf(!container)('friends migration', () => {
  // Everything runs in one rolled-back transaction: the old buddy tables are dropped by the
  // migration, so this must never commit against a shared database.
  const run = (checks: string, withPairs = true) =>
    sql(`begin;
      insert into auth.users(id) values ('${a}'),('${b}'),('${c}'),('${d}') on conflict do nothing;
      insert into public.profiles(id) values ('${a}'),('${b}'),('${c}'),('${d}') on conflict do nothing;
      insert into public.dishes(id,slug,name,category,unit,grams_per_unit,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,source,basis,unit_basis)
        values ('${dish}','test-roti-f','Roti','roti','roti',40,300,9,50,5,'khan2019','lab','derived') on conflict do nothing;
      ${
        withPairs
          ? `insert into public.buddy_pairs(inviter_id,invitee_id,invite_code,status,accepted_at) values
        ('${b}','${a}','AAAAAA','active','2026-11-01T10:00:00Z'),
        ('${c}',null,'BBBBBB','pending',null);`
          : ''
      }
      -- 19:30Z on 11-02 is 00:30 PKT on 11-03; the second meal has no confirmed item.
      insert into public.meals(id,user_id,eaten_at) values ('${meal1}','${a}','2026-11-02T19:30:00Z'),('${meal2}','${d}','2026-11-02T08:00:00Z');
      insert into public.meal_items(meal_id,confirmed_dish_id,confirmed_portion) values ('${meal1}','${dish}',2);
      insert into public.meal_items(meal_id,predicted_dish_id) values ('${meal2}','${dish}');
      ${migrationSql}
      ${checks}
      rollback;`);

  it('migrates an active pair, ignores a pending invite, backfills PKT streak days', async () => {
    const out =
      await run(`select 'F', count(*), min(status), bool_or(accepted_at = '2026-11-01T10:00:00Z' and requested_by = '${b}' and user_low < user_high) from public.friendships;
      select 'S', string_agg(user_id::text || ':' || day, ',') from public.streak_days;`);
    expect(out).toContain('F|1|active|t');
    expect(out).toContain(`S|${a}:2026-11-03`);
    expect(out).not.toContain(d);
  });

  it('migrates cleanly with zero buddy pairs', async () => {
    const out = await run(`select 'F', count(*) from public.friendships;`, false);
    expect(out).toContain('F|0');
  });

  it('rejects a nudge without a day and a notification for a missing goal', async () => {
    await expect(
      run(
        `insert into public.notifications(user_id,kind,actor_id) values ('${a}','nudge','${b}');`,
      ),
    ).rejects.toThrow(/violates check constraint/);
    await expect(
      run(
        `insert into public.notifications(user_id,kind,actor_id,goal_id) values ('${a}','cheer','${b}','${id(99)}');`,
      ),
    ).rejects.toThrow(/violates foreign key constraint/);
  });

  it('enforces one nudge per day, one active goal, and blocks the authenticated role', async () => {
    await expect(
      run(
        `insert into public.notifications(user_id,kind,actor_id,day) values ('${a}','nudge','${b}','2026-11-03'),('${a}','nudge','${b}','2026-11-03');`,
      ),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      run(
        `insert into public.goals(user_id,type,target,start_day,status) values ('${a}','streak',3,'2026-11-03','active'),('${a}','streak',5,'2026-11-03','active');`,
      ),
    ).rejects.toThrow(/duplicate key/);
    for (const t of ['friendships', 'notifications', 'goals', 'goal_cheers']) {
      await expect(
        run(
          `grant usage on schema public to authenticated; set local role authenticated; select * from public.${t};`,
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });
});
