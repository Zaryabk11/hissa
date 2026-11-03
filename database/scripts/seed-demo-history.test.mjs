import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildDemoHistory, DAYS, readTarget, seedDemoHistory } from './seed-demo-history.mjs';

const DEMO = '4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const OTHER = '9a8b7c6d-5e4f-4321-8abc-def012345678';
const NOW = new Date('2026-11-03T10:00:00Z'); // 15:00 PKT on 2026-11-03
const env = {
  DEMO_USER_ID: DEMO,
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
};

test('refuses to run without a valid demo user id or without the service credentials', () => {
  assert.throws(() => readTarget({ ...env, DEMO_USER_ID: undefined }), /DEMO_USER_ID/);
  assert.throws(() => readTarget({ ...env, DEMO_USER_ID: '' }), /DEMO_USER_ID/);
  assert.throws(() => readTarget({ ...env, DEMO_USER_ID: 'someone@example.com' }), /DEMO_USER_ID/);
  assert.throws(
    () => readTarget({ ...env, SUPABASE_SERVICE_ROLE_KEY: '' }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  );
  assert.throws(() => readTarget({ ...env, SUPABASE_URL: undefined }), /SUPABASE_URL/);
});

test('history is two weeks of meals with one check-in each, all owned by the demo user', () => {
  const { meals, items, checkins } = buildDemoHistory(DEMO, NOW);
  assert.equal(meals.length, DAYS * 2);
  assert.equal(checkins.length, meals.length);
  assert.equal(items.length, meals.length);
  assert.ok(meals.every((m) => m.user_id === DEMO));
  assert.ok(checkins.every((c) => c.user_id === DEMO));
  const mealIds = new Set(meals.map((m) => m.id));
  assert.equal(mealIds.size, meals.length);
  assert.ok(checkins.every((c) => mealIds.has(c.meal_id)));
  assert.ok(items.every((i) => mealIds.has(i.meal_id)));
  const earliest = Date.parse('2026-10-20T00:00:00Z');
  assert.ok(
    meals.every(
      (m) => Date.parse(m.eaten_at) >= earliest && Date.parse(m.eaten_at) < NOW.getTime(),
    ),
  );
});

test('every check-in comes 90 minutes to 24 hours after its meal and is not in the future', () => {
  const { meals, checkins } = buildDemoHistory(DEMO, NOW);
  const eaten = Object.fromEntries(meals.map((m) => [m.id, Date.parse(m.eaten_at)]));
  for (const c of checkins) {
    const gap = Date.parse(c.created_at) - eaten[c.meal_id];
    assert.ok(gap >= 90 * 60_000 && gap <= 24 * 3_600_000);
    assert.ok(Date.parse(c.created_at) <= NOW.getTime());
  }
});

test('the last seven PKT days meet the weekly card rules for a rice pattern', () => {
  const { meals, items, checkins } = buildDemoHistory(DEMO, NOW);
  const weekStart = Date.parse('2026-10-28T00:00:00+05:00');
  const week = meals.filter((m) => Date.parse(m.eaten_at) >= weekStart);
  assert.ok(week.length >= 7);
  const rice = week.filter((m) =>
    items.some((i) => i.meal_id === m.id && i.slug === 'chicken-biryani'),
  );
  const heavy = rice.filter((m) => checkins.find((c) => c.meal_id === m.id).stomach === 'heavy');
  assert.ok(rice.length >= 3);
  assert.ok(heavy.length * 5 >= rice.length * 3, '>= 60% of rice meals heavy');
});

test('ids are stable across runs and never shared between users', () => {
  const a = buildDemoHistory(DEMO, NOW);
  assert.deepEqual(buildDemoHistory(DEMO, NOW), a);
  const b = buildDemoHistory(OTHER, NOW);
  const ids = (h) => [...h.meals, ...h.items, ...h.checkins].map((r) => r.id);
  assert.equal(new Set([...ids(a), ...ids(b)]).size, ids(a).length * 2);
});

// A fake PostgREST: stores rows per table by id and records every request.
function fakeRest({ profiles = [{ id: DEMO }] } = {}) {
  const tables = { meals: new Map(), meal_items: new Map(), feel_checkins: new Map() };
  const requests = [];
  const dishes = ['chicken-biryani', 'mixed-daal', 'chicken-karahi'].map((slug) => ({
    slug,
    id: `d-${slug}`,
  }));
  const fetchImpl = async (url, init = {}) => {
    const path = url.split('/rest/v1/')[1];
    const table = path.split('?')[0];
    requests.push({ method: init.method ?? 'GET', table, path });
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    if (!init.method) return ok(table === 'profiles' ? profiles : dishes);
    for (const row of JSON.parse(init.body))
      tables[table].set(row.id, { ...tables[table].get(row.id), ...row });
    return ok(null);
  };
  return { tables, requests, fetchImpl };
}

test('seeding twice creates no duplicates and writes only the demo user', async () => {
  const rest = fakeRest();
  await seedDemoHistory({ env, now: NOW, fetchImpl: rest.fetchImpl });
  const counts = () => Object.values(rest.tables).map((t) => t.size);
  const first = counts();
  await seedDemoHistory({ env, now: NOW, fetchImpl: rest.fetchImpl });
  assert.deepEqual(counts(), first);
  assert.deepEqual(first, [DAYS * 2, DAYS * 2, DAYS * 2]);
  for (const row of [...rest.tables.meals.values(), ...rest.tables.feel_checkins.values()])
    assert.equal(row.user_id, DEMO);
  const written = new Set(rest.requests.filter((r) => r.method === 'POST').map((r) => r.table));
  assert.deepEqual([...written].sort(), ['feel_checkins', 'meal_items', 'meals']);
  assert.ok(rest.requests.every((r) => r.method !== 'DELETE' && r.method !== 'PATCH'));
});

test('a run on a later day moves the same rows instead of adding more', async () => {
  const rest = fakeRest();
  await seedDemoHistory({ env, now: NOW, fetchImpl: rest.fetchImpl });
  await seedDemoHistory({
    env,
    now: new Date(NOW.getTime() + 24 * 3_600_000),
    fetchImpl: rest.fetchImpl,
  });
  assert.equal(rest.tables.meals.size, DAYS * 2);
});

test('refuses when the demo user does not exist, and writes nothing', async () => {
  const rest = fakeRest({ profiles: [] });
  await assert.rejects(
    seedDemoHistory({ env, now: NOW, fetchImpl: rest.fetchImpl }),
    /No Supabase user/,
  );
  assert.ok(rest.requests.every((r) => r.method === 'GET'));
});

test('refuses without an id before any request, and dry run makes none', async () => {
  const rest = fakeRest();
  await assert.rejects(
    seedDemoHistory({ env: { ...env, DEMO_USER_ID: '' }, fetchImpl: rest.fetchImpl }),
    /DEMO_USER_ID/,
  );
  const result = await seedDemoHistory({ env, now: NOW, fetchImpl: rest.fetchImpl, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal(rest.requests.length, 0);
});

test('every seeded dish is in the real catalog', () => {
  const catalog = readFileSync(new URL('../data/catalog.csv', import.meta.url), 'utf8');
  const slugs = new Set(catalog.split('\n').map((l) => l.split(',')[0]));
  for (const { slug } of buildDemoHistory(DEMO, NOW).items) assert.ok(slugs.has(slug), slug);
});
