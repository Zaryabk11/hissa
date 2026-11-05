import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowId } from './seed-demo-history.mjs';
import { buildWorld, PERSONAS } from './seed-demo-world.mjs';

const NOW = new Date('2026-11-05T10:00:00Z'); // 15:00 PKT, 2026-11-05
const TODAY = '2026-11-05';
const REAL = ['5c6ab65a-aa79-4e90-a227-7a490a52a136', '7b8df26d-8818-49ef-94d3-7ca0c2dc1cfb'];
const dummies = Object.fromEntries(PERSONAS.map((p) => [p.u, rowId(p.u, 'test')]));
const cat = { 'chicken-biryani': 'rice', raita: 'other', roti: 'roti' };
// Any slug resolves to a dish; the builder only needs the fields below.
const dishes = new Proxy({}, {
  get: (_, slug) => ({ id: `dish-${slug}`, slug, category: cat[slug] ?? 'meat', kcal_per_100g: 150, grams_per_unit: 200, protein_type: slug.includes('beef') ? 'beef' : slug.includes('chicken') ? 'chicken' : null }),
});
const build = (extra = {}) => buildWorld({ dummies, real: REAL, dishes, now: NOW, ...extra });
const daysOf = (w, userId) => new Set(w.streakDays.filter((d) => d.user_id === userId).map((d) => d.day));

test('is deterministic: the same input gives the same rows and ids', () => {
  assert.deepEqual(build(), build());
});

test('streak shapes: logged today, yesterday-only, and broken', () => {
  const w = build();
  assert.ok(daysOf(w, dummies.ayesha_k).has(TODAY), 'ayesha logged today');
  assert.ok(!daysOf(w, dummies.hamza_a).has(TODAY) && daysOf(w, dummies.hamza_a).has('2026-11-04'), 'hamza: yesterday, not yet today');
  assert.ok(!daysOf(w, dummies.bilal_r).has('2026-11-04') && daysOf(w, dummies.bilal_r).has('2026-11-02'), 'bilal: streak lost');
  assert.equal([...daysOf(w, dummies.zainab_f)].filter((d) => d >= '2026-10-17').length, 20);
});

test('no meal is in the future and a streak day always has a meal that day', () => {
  const w = build();
  for (const m of w.meals) assert.ok(Date.parse(m.eaten_at) <= NOW.getTime(), `${m.id} in the future`);
  for (const d of w.streakDays) {
    const has = w.meals.some((m) => m.user_id === d.user_id && new Date(Date.parse(m.eaten_at) + 5 * 3_600_000).toISOString().slice(0, 10) === d.day);
    assert.ok(has, `${d.day} has no meal`);
  }
});

test('people never get a protein they avoid', () => {
  const w = build();
  const protein = Object.fromEntries(w.items.map((i) => [i.confirmed_dish_id, i.confirmed_dish_id.includes('beef') ? 'beef' : null]));
  const mealOwner = Object.fromEntries(w.meals.map((m) => [m.id, m.user_id]));
  for (const i of w.items)
    if (protein[i.confirmed_dish_id] === 'beef') assert.notEqual(mealOwner[i.meal_id], dummies.ayesha_k);
});

test('real users get sample days only where they logged nothing, and never today', () => {
  const have = new Set(['2026-11-04', '2026-11-03']);
  const w = build({ existingDays: { [REAL[0]]: have } });
  const days = daysOf(w, REAL[0]);
  assert.ok(!days.has(TODAY) && !days.has('2026-11-04') && !days.has('2026-11-03'));
  assert.equal(days.size, 12);
  assert.equal(daysOf(w, REAL[1]).size, 14);
});

test('real users get demo friends, a pending request, and four inbox items', () => {
  const w = build();
  for (const r of REAL) {
    const mine = w.friendships.filter((f) => f.user_low === r || f.user_high === r);
    assert.equal(mine.filter((f) => f.status === 'active').length, 7);
    assert.equal(mine.filter((f) => f.status === 'pending').length, 1);
    assert.deepEqual(w.notifications.filter((n) => n.user_id === r).map((n) => n.kind).sort(), ['friend_request', 'goal_reached', 'nudge', 'request_accepted']);
  }
});

test('friendship rows satisfy the table constraints', () => {
  const w = build();
  const pairs = new Set();
  for (const f of w.friendships) {
    assert.ok(f.user_low < f.user_high);
    assert.ok([f.user_low, f.user_high].includes(f.requested_by));
    const key = `${f.user_low}:${f.user_high}`;
    assert.ok(!pairs.has(key), 'duplicate pair');
    pairs.add(key);
  }
  for (const n of w.notifications) if (n.kind === 'nudge') assert.ok(n.day);
});

test('goals match the friends screens: one shared reached goal with cheers, active ones in progress', () => {
  const w = build();
  const reached = w.goals.filter((g) => g.status === 'reached');
  assert.equal(reached.length, 1);
  assert.ok(Date.parse(reached[0].reached_at) > NOW.getTime() - 48 * 3_600_000);
  assert.equal(w.cheers.filter((c) => c.goal_id === reached[0].id).length, 2);
  assert.ok(w.goals.every((g) => g.shared));
  assert.equal(new Set(w.goals.filter((g) => g.status === 'active').map((g) => g.user_id)).size, 3);
});

test('throws on a dish that is not in the catalog', () => {
  assert.throws(() => build({ dishes: { 'mixed-daal': dishes['mixed-daal'] } }), /not in the catalog/);
});
