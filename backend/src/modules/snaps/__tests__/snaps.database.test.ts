import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

// Optional real PostgreSQL check of migration 20261106000000 (snaps). Use a disposable container
// initialized with the Supabase roles/auth stub (and, to check the buckets, a storage.buckets
// table) and every migration up to 20261105000000 applied; this test replays the snaps migration
// inside its own transaction and rolls back.
// HISSA_TEST_POSTGRES_CONTAINER=<container> npm test -w backend -- snaps.database --no-file-parallelism
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const migrationSql = readFileSync(
  join(__dirname, '../../../../../database/supabase/migrations/20261106000000_snaps.sql'),
  'utf8',
);
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [a, b, meal1, snap1, snap2] = [id(11), id(12), id(31), id(41), id(42)];
const meal2 = id(32);

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

describe.skipIf(!container)('snaps migration', () => {
  const run = (checks: string) =>
    sql(`begin;
      insert into auth.users(id) values ('${a}'),('${b}') on conflict do nothing;
      insert into public.profiles(id) values ('${a}'),('${b}') on conflict do nothing;
      insert into public.meals(id,user_id) values ('${meal1}','${a}'),('${meal2}','${a}');
      ${migrationSql}
      ${checks}
      rollback;`);
  const snap = (n: string, meal: string) =>
    `insert into public.snaps(id,sender_id,meal_id,object_path,expires_at) values ('${n}','${a}','${meal}','${a}/${n}.jpg', now() + interval '24 hours');`;

  it('allows one snap per meal and one row per recipient', async () => {
    await expect(run(`${snap(snap1, meal1)} ${snap(snap2, meal1)}`)).rejects.toThrow(
      /duplicate key/,
    );
    const recipient = `insert into public.snap_recipients(snap_id,recipient_id,expires_at) values ('${snap1}','${b}', now());`;
    await expect(run(`${snap(snap1, meal1)} ${recipient} ${recipient}`)).rejects.toThrow(
      /duplicate key/,
    );
    const out = await run(
      `${snap(snap1, meal1)} ${recipient} select 'R', audience from public.snap_recipients;`,
    );
    expect(out).toContain('R|friend');
  });

  it('keeps the snap when its meal is deleted and drops meals.photo_path', async () => {
    const out = await run(`${snap(snap1, meal1)}
      delete from public.meals where id = '${meal1}';
      select 'S', meal_id is null from public.snaps where id = '${snap1}';
      select 'C', count(*) from information_schema.columns where table_name = 'meals' and column_name = 'photo_path';`);
    expect(out).toContain('S|t');
    expect(out).toContain('C|0');
  });

  it('accepts cheer_streak only with a day, once per actor/user/day', async () => {
    const cheer = (day: string) =>
      `insert into public.notifications(user_id,kind,actor_id${day ? ',day' : ''}) values ('${a}','cheer_streak','${b}'${day ? `,'${day}'` : ''});`;
    await expect(run(cheer(''))).rejects.toThrow(/violates check constraint/);
    await expect(run(`${cheer('2026-11-06')} ${cheer('2026-11-06')}`)).rejects.toThrow(
      /duplicate key/,
    );
    await run(`${cheer('2026-11-06')} ${cheer('2026-11-07')}`);
  });

  it('blocks the authenticated role and creates private jpeg buckets', async () => {
    for (const t of ['snaps', 'snap_recipients', 'reports']) {
      await expect(
        run(
          `grant usage on schema public to authenticated; set local role authenticated; select * from public.${t};`,
        ),
      ).rejects.toThrow(/permission denied/);
    }
    if ((await sql(`select to_regclass('storage.buckets') is not null`)) === 't') {
      const out = await run(
        `select 'B', id, public, allowed_mime_types::text from storage.buckets where id in ('snaps','snap-reports') order by id;`,
      );
      expect(out).toContain('B|snap-reports|f|{image/jpeg}');
      expect(out).toContain('B|snaps|f|{image/jpeg}');
    }
  });

  it('claims a recipient row once: a second conditional update changes 0 rows', async () => {
    const claim = `update public.snap_recipients set opened_at = now()
      where snap_id = '${snap1}' and recipient_id = '${b}' and opened_at is null and expires_at > now()
      returning 'U';`;
    const out = await run(`${snap(snap1, meal1)}
      insert into public.snap_recipients(snap_id,recipient_id,expires_at) values ('${snap1}','${b}', now() + interval '1 hour');
      ${claim} select 'N', count(*) from public.snap_recipients where opened_at is not null;
      ${claim} select 'M', count(*) from public.snap_recipients where opened_at is not null;`);
    expect(out.split('\n').filter((l) => l === 'U')).toHaveLength(1);
    expect(out).toContain('N|1');
    expect(out).toContain('M|1');
  });

  it('does not claim an expired recipient row', async () => {
    const out = await run(`${snap(snap1, meal1)}
      insert into public.snap_recipients(snap_id,recipient_id,expires_at) values ('${snap1}','${b}', now() - interval '1 second');
      update public.snap_recipients set opened_at = now()
        where snap_id = '${snap1}' and recipient_id = '${b}' and opened_at is null and expires_at > now();
      select 'E', count(*) from public.snap_recipients where opened_at is not null;`);
    expect(out).toContain('E|0');
  });
});
