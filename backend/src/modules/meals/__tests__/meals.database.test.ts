import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Optional real PostgreSQL checks for meal_delete and meal_replace_items. Use only a disposable
// container initialized with the repository migrations and Supabase auth roles/schema.
// HISSA_TEST_POSTGRES_CONTAINER=<name> npm test -w backend -- --no-file-parallelism meals.database
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const u1 = '00000000-0000-0000-0000-0000000000b1';
const u2 = '00000000-0000-0000-0000-0000000000b2';
const dish = '00000000-0000-0000-0000-0000000000d2';
const m = (n: number) => `00000000-0000-0000-0000-00000000010${n}`;

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
// Runs as the backend's role; the last output line is the statement's result (psql prints SET first).
async function asService(statement: string): Promise<string> {
  return (await sql(`set role service_role; ${statement}`)).split('\n').pop() ?? '';
}
const del = (user: string, meal: string) =>
  asService(`select public.meal_delete('${user}','${meal}');`);
const days = (user: string) =>
  sql(
    `select coalesce(string_agg(day::text, ',' order by day), '') from public.streak_days where user_id='${user}'`,
  );
const count = (table: string, where: string) =>
  sql(`select count(*) from public.${table} where ${where}`);
// A meal with one confirmed item, at the given instant.
const meal = (id: string, user: string, at: string) =>
  `insert into public.meals(id,user_id,eaten_at,total_calories) values ('${id}','${user}','${at}',100);
   insert into public.meal_items(meal_id,confirmed_dish_id,confirmed_portion) values ('${id}','${dish}',1);`;

describe.skipIf(!container)('meal_delete and meal_replace_items', () => {
  beforeAll(async () => {
    await sql(`insert into auth.users(id) values ('${u1}'),('${u2}') on conflict do nothing;`);
    await sql(
      `insert into public.dishes(id,slug,name,category,unit,grams_per_unit,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,source,basis,unit_basis)
       values ('${dish}','test-meal-roti','Roti','roti','roti',40,300,9,50,5,'khan2019','lab','derived') on conflict do nothing;`,
    );
  });
  beforeEach(async () => {
    await sql('truncate public.meals, public.streak_days, public.user_experiments cascade');
  });

  it('deleting the last meal of a PKT day removes that streak day only', async () => {
    // 19:30Z on 1 Nov is 00:30 PKT on 2 Nov.
    await sql(`${meal(m(1), u1, '2026-11-01T19:30:00Z')} ${meal(m(2), u1, '2026-11-01T08:00:00Z')}
      insert into public.streak_days(user_id,day) values ('${u1}','2026-11-02'),('${u1}','2026-11-01');`);
    expect(await del(u1, m(1))).toBe('t');
    expect(await days(u1)).toBe('2026-11-01');
    expect(await count('meals', `id='${m(1)}'`)).toBe('0');
    expect(await count('meal_items', `meal_id='${m(1)}'`)).toBe('0');
  });

  it('keeps the streak day while another meal with a confirmed item remains that PKT day', async () => {
    await sql(`${meal(m(1), u1, '2026-11-01T08:00:00Z')} ${meal(m(2), u1, '2026-11-01T12:00:00Z')}
      insert into public.streak_days(user_id,day) values ('${u1}','2026-11-01');`);
    expect(await del(u1, m(1))).toBe('t');
    expect(await days(u1)).toBe('2026-11-01');
    expect(await count('meals', `id='${m(2)}'`)).toBe('1');
  });

  it('a leftover header with no confirmed item does not keep the day alive', async () => {
    await sql(`${meal(m(1), u1, '2026-11-01T08:00:00Z')}
      insert into public.meals(id,user_id,eaten_at) values ('${m(2)}','${u1}','2026-11-01T09:00:00Z');
      insert into public.streak_days(user_id,day) values ('${u1}','2026-11-01');`);
    expect(await del(u1, m(1))).toBe('t');
    expect(await days(u1)).toBe('');
  });

  it('removes check-ins and clears an experiment link without deleting the experiment', async () => {
    await sql(`${meal(m(1), u1, '2026-11-01T08:00:00Z')}
      insert into public.feel_checkins(user_id,meal_id,energy,stomach) values ('${u1}','${m(1)}','good','fine');
      insert into public.user_experiments(id,user_id,pattern_key,action,status,tried_at,tried_meal_id)
        values ('${m(9)}','${u1}','category:rice:heavy','smaller_portion','tried',now(),'${m(1)}');`);
    expect(await del(u1, m(1))).toBe('t');
    expect(await count('feel_checkins', `meal_id='${m(1)}'`)).toBe('0');
    expect(
      await sql(
        `select tried_meal_id is null and status='tried' and tried_at is not null from public.user_experiments where id='${m(9)}'`,
      ),
    ).toBe('t');
  });

  it("another user's or unknown meal returns false and changes nothing", async () => {
    await sql(`${meal(m(1), u1, '2026-11-01T08:00:00Z')}
      insert into public.feel_checkins(user_id,meal_id,energy,stomach) values ('${u1}','${m(1)}','good','fine');
      insert into public.streak_days(user_id,day) values ('${u1}','2026-11-01'),('${u2}','2026-11-01');`);
    expect(await del(u2, m(1))).toBe('f');
    expect(await del(u1, m(5))).toBe('f');
    expect(await count('meals', `id='${m(1)}'`)).toBe('1');
    expect(await count('meal_items', `meal_id='${m(1)}'`)).toBe('1');
    expect(await count('feel_checkins', `meal_id='${m(1)}'`)).toBe('1');
    expect(await days(u1)).toBe('2026-11-01');
    expect(await days(u2)).toBe('2026-11-01');
  });

  it("deleting one user's meal leaves the other user's same-day streak and meals alone", async () => {
    await sql(`${meal(m(1), u1, '2026-11-01T08:00:00Z')} ${meal(m(2), u2, '2026-11-01T08:00:00Z')}
      insert into public.streak_days(user_id,day) values ('${u1}','2026-11-01'),('${u2}','2026-11-01');`);
    expect(await del(u1, m(1))).toBe('t');
    expect(await days(u1)).toBe('');
    expect(await days(u2)).toBe('2026-11-01');
    expect(await count('meals', `id='${m(2)}'`)).toBe('1');
  });

  it('replaces items and total for the owner, keeping eaten_at and the streak day', async () => {
    await sql(`${meal(m(1), u1, '2026-11-01T08:00:00Z')}
      insert into public.streak_days(user_id,day) values ('${u1}','2026-11-01');`);
    const items = JSON.stringify([
      {
        predicted_dish_id: dish,
        confirmed_dish_id: dish,
        predicted_portion: 1,
        confirmed_portion: 3,
        confidence: 0.5,
      },
      {
        predicted_dish_id: null,
        confirmed_dish_id: dish,
        predicted_portion: null,
        confirmed_portion: 2,
        confidence: null,
      },
    ]);
    expect(
      await asService(`select public.meal_replace_items('${u1}','${m(1)}',500,'${items}'::jsonb);`),
    ).toBe('t');
    expect(
      await sql(
        `select count(*), sum(confirmed_portion) from public.meal_items where meal_id='${m(1)}'`,
      ),
    ).toBe('2|5');
    expect(
      await sql(
        `select total_calories::int, eaten_at='2026-11-01T08:00:00Z' from public.meals where id='${m(1)}'`,
      ),
    ).toBe('500|t');
    expect(
      await sql(
        `select count(*) from public.meal_items where meal_id='${m(1)}' and predicted_dish_id is null and confidence is null`,
      ),
    ).toBe('1');
    expect(await days(u1)).toBe('2026-11-01');
  });

  it("does not replace another user's meal", async () => {
    await sql(meal(m(1), u1, '2026-11-01T08:00:00Z'));
    const items = JSON.stringify([
      {
        predicted_dish_id: null,
        confirmed_dish_id: dish,
        predicted_portion: null,
        confirmed_portion: 9,
        confidence: null,
      },
    ]);
    expect(
      await asService(`select public.meal_replace_items('${u2}','${m(1)}',999,'${items}'::jsonb);`),
    ).toBe('f');
    expect(
      await sql(`select confirmed_portion::int from public.meal_items where meal_id='${m(1)}'`),
    ).toBe('1');
    expect(await sql(`select total_calories::int from public.meals where id='${m(1)}'`)).toBe(
      '100',
    );
  });

  it('a failing replace keeps the old items and total (one transaction)', async () => {
    await sql(meal(m(1), u1, '2026-11-01T08:00:00Z'));
    // Neither dish set violates the meal_items check, after the old items were deleted in the function.
    const items = JSON.stringify([
      {
        predicted_dish_id: null,
        confirmed_dish_id: null,
        predicted_portion: 1,
        confirmed_portion: null,
        confidence: null,
      },
    ]);
    await expect(
      asService(`select public.meal_replace_items('${u1}','${m(1)}',999,'${items}'::jsonb);`),
    ).rejects.toThrow();
    expect(
      await sql(`select confirmed_portion::int from public.meal_items where meal_id='${m(1)}'`),
    ).toBe('1');
    expect(await sql(`select total_calories::int from public.meals where id='${m(1)}'`)).toBe(
      '100',
    );
  });

  it('is not callable by anon or authenticated clients', async () => {
    await sql(meal(m(1), u1, '2026-11-01T08:00:00Z'));
    for (const role of ['anon', 'authenticated']) {
      await expect(
        sql(`set role ${role}; select public.meal_delete('${u1}','${m(1)}');`),
      ).rejects.toThrow();
    }
    expect(await count('meals', `id='${m(1)}'`)).toBe('1');
  });
});
