// Fills an environment with SAMPLE people and activity so every screen has something to show:
// 8 invented users (auth emails end in @demo.hissa.invalid, no password, nobody can sign in as them),
// three weeks of sample meals and check-ins, streaks, friendships, goals, cheers and inbox items.
// Every REAL (non-demo) user also gets two weeks of sample meals on days they logged nothing, plus
// the demo users as friends. Real rows are never changed or deleted. Everything is invented.
//
//   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node database/scripts/seed-demo-world.mjs [--dry-run|--remove]
//
// Re-running is safe: every row id is derived from the user id and a name, so rows update in place.
// --remove deletes the demo users (their data cascades) and the sample rows added to real users.
import { pathToFileURL } from 'node:url';
import { rowId } from './seed-demo-history.mjs';

export const DEMO_DOMAIN = 'demo.hissa.invalid';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PKT = 5 * HOUR;
const BREAKFAST = ['anda-paratha', 'paratha', 'khichdi', 'chai'];
const HOURS = { breakfast: 9, lunch: 14, dinner: 20 };

// end = how many days ago the streak run ended (0 = logged today), len = days in that run.
export const PERSONAS = [
  { u: 'ayesha_k', name: 'Ayesha Khan', goal: 'lose', sex: 'female', age: 27, h: 163, w: 64, act: 'light', kcal: 1650, macros: [95, 170, 55], avoid: ['beef'], end: 0, len: 12, lunch: ['chicken-biryani', 'mixed-daal', 'chicken-karahi', 'khichdi', 'fish-curry'], dinner: ['mixed-daal', 'mixed-sabzi', 'chicken-tikka', 'palak'] },
  { u: 'hamza_a', name: 'Hamza Ali', goal: 'maintain', sex: 'male', age: 31, h: 178, w: 82, act: 'moderate', kcal: 2400, avoid: [], end: 1, len: 6, lunch: ['beef-biryani', 'nihari', 'chicken-karahi', 'chapli-kebab'], dinner: ['seekh-kebab', 'mutton-karahi', 'daal-kaddu'] },
  { u: 'sana_m', name: 'Sana Malik', goal: 'lose', sex: 'female', age: 24, h: 158, w: 58, act: 'light', kcal: 1500, macros: [70, 160, 45], avoid: ['beef', 'mutton', 'chicken'], end: 0, len: 9, lunch: ['chana-daal', 'choley', 'khichdi', 'bhindi'], dinner: ['mixed-daal', 'aloo-palak', 'mixed-sabzi', 'lobia'] },
  { u: 'bilal_r', name: 'Bilal Raza', goal: 'maintain', sex: 'male', age: 35, h: 175, w: 88, act: 'sedentary', kcal: 2600, avoid: [], end: 3, len: 5, lunch: ['mutton-biryani', 'aloo-gosht', 'haleem', 'chicken-biryani'], dinner: ['beef-karahi', 'kofta', 'nihari', 'jalebi'] },
  { u: 'maryam_s', name: 'Maryam Siddiqui', goal: 'lose', sex: 'female', age: 29, h: 165, w: 66, act: 'moderate', kcal: 1550, macros: [100, 150, 50], avoid: ['beef'], end: 0, len: 9, lunch: ['fish-curry', 'machli', 'chicken-pulao', 'mixed-daal'], dinner: ['chicken-tikka', 'mixed-sabzi', 'lobia'] },
  { u: 'usman_t', name: 'Usman Tariq', goal: 'maintain', sex: 'male', age: 22, h: 180, w: 74, act: 'active', kcal: 2800, avoid: [], end: 0, len: 4, lunch: ['beef-biryani', 'chicken-biryani', 'chapli-kebab', 'samosa'], dinner: ['seekh-kebab', 'chicken-karahi', 'haleem'] },
  { u: 'zainab_f', name: 'Zainab Farooq', goal: 'lose', sex: 'female', age: 33, h: 160, w: 62, act: 'light', kcal: 1600, macros: [85, 175, 50], avoid: ['beef', 'mutton'], end: 0, len: 20, lunch: ['daal-kaddu', 'maash-daal', 'khichdi', 'karela'], dinner: ['mixed-sabzi', 'aloo-methi', 'palak', 'mixed-daal'] },
  { u: 'danish_q', name: 'Danish Qureshi', goal: 'maintain', sex: 'male', age: 40, h: 172, w: 79, act: 'sedentary', kcal: 2300, avoid: [], end: 1, len: 2, lunch: ['mutton-pulao', 'chicken-korma', 'aloo-gosht'], dinner: ['mixed-daal', 'bhindi', 'kheer'] },
];
const REAL_POOL = { lunch: ['chicken-biryani', 'mixed-daal', 'chicken-karahi', 'chana-daal', 'khichdi'], dinner: ['mixed-sabzi', 'daal-kaddu', 'chicken-tikka', 'palak'] };
// Friends of every real user (usernames), then who has a pending request to them, then dummy-dummy pairs.
const REAL_FRIENDS = ['ayesha_k', 'hamza_a', 'sana_m', 'maryam_s', 'zainab_f', 'bilal_r', 'usman_t'];
const PENDING_TO_REAL = ['danish_q'];
const DUMMY_PAIRS = [['ayesha_k', 'hamza_a'], ['ayesha_k', 'sana_m'], ['sana_m', 'maryam_s'], ['zainab_f', 'ayesha_k'], ['hamza_a', 'usman_t'], ['bilal_r', 'hamza_a']];

const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = (arr, seed) => arr[hash(seed) % arr.length];

export function buildWorld({ dummies, real, dishes, avoids = {}, existingDays = {}, now = new Date() }) {
  const todayStart = Math.floor((now.getTime() + PKT) / DAY) * DAY - PKT; // PKT midnight, as a UTC instant
  const dayStr = (k) => new Date(todayStart + PKT - k * DAY).toISOString().slice(0, 10);
  const world = { profiles: [], avoids: [], meals: [], items: [], checkins: [], streakDays: [], friendships: [], goals: [], cheers: [], notifications: [] };
  const id = (user, name) => rowId(user, `world:${name}`);
  const dish = (slug) => {
    if (!dishes[slug]) throw new Error(`Dish "${slug}" is not in the catalog.`);
    return dishes[slug];
  };

  const addDay = (userId, k, pools, blocked, salt) => {
    const at = (slot) => todayStart - k * DAY + HOURS[slot] * HOUR;
    let slots = ['breakfast', 'lunch', 'dinner'].filter((s) => s !== 'breakfast' || (k + salt) % 3 !== 0);
    if (k === 0) slots = slots.filter((s) => at(s) <= now.getTime() - 60_000); // today: only meals that have happened
    if (!slots.length) slots = ['breakfast']; // logged today, but early: one meal just now
    for (const slot of slots) {
      const eaten = Math.min(at(slot), now.getTime() - 60_000);
      const allowed = (pools[slot] ?? BREAKFAST).filter((s) => !blocked(dish(s)));
      const main = pick(allowed.length ? allowed : ['mixed-daal'], `${userId}:${k}:${slot}`);
      const slugs = [main];
      const m = dish(main);
      const side = { rice: 'raita', meat: 'roti', lentil: 'roti', other: 'roti' }[m.category];
      if (slot !== 'breakfast' && side && hash(`${userId}:${k}:${slot}:side`) % 4) slugs.push(side);
      const mealId = id(userId, `meal:${k}:${slot}`);
      let total = 0;
      slugs.forEach((slug, i) => {
        const d = dish(slug);
        const portion = [0.75, 1, 1, 1.25][hash(`${userId}:${k}:${slot}:${slug}`) % 4];
        total += Math.round((d.kcal_per_100g * d.grams_per_unit * portion) / 100);
        world.items.push({ id: id(userId, `item:${k}:${slot}:${i}`), meal_id: mealId, predicted_dish_id: d.id, confirmed_dish_id: d.id, predicted_portion: portion, confirmed_portion: portion, confidence: 0.9 });
      });
      world.meals.push({ id: mealId, user_id: userId, eaten_at: new Date(eaten).toISOString(), created_at: new Date(eaten).toISOString(), total_calories: total });
      if (eaten <= now.getTime() - 3 * HOUR && hash(`${mealId}:c`) % 4) {
        const cat = m.category;
        const flip = hash(`${mealId}:f`) % 5 === 0;
        const stomach = cat === 'rice' || cat === 'fried' || cat === 'sweets' ? (flip ? 'fine' : 'heavy') : cat === 'lentil' ? (flip ? 'fine' : 'light') : 'fine';
        const energy = cat === 'lentil' ? 'good' : cat === 'rice' ? (flip ? 'okay' : 'low') : 'okay';
        world.checkins.push({ id: id(userId, `checkin:${k}:${slot}`), user_id: userId, meal_id: mealId, energy, stomach, created_at: new Date(eaten + 3 * HOUR).toISOString() });
      }
    }
    world.streakDays.push({ user_id: userId, day: dayStr(k) });
  };

  PERSONAS.forEach((p, idx) => {
    const userId = dummies[p.u];
    world.profiles.push({ id: userId, display_name: p.name, username: p.u, goal: p.goal, sex: p.sex, age: p.age, height_cm: p.h, weight_kg: p.w, activity_level: p.act, daily_calorie_budget: p.kcal, protein_target_g: p.macros?.[0] ?? null, carbs_target_g: p.macros?.[1] ?? null, fat_target_g: p.macros?.[2] ?? null });
    for (const protein of p.avoid) world.avoids.push({ id: id(userId, `avoid:${protein}`), user_id: userId, kind: 'protein', protein });
    const ks = new Set();
    for (let k = p.end; k < p.end + p.len; k++) ks.add(k);
    for (let k = p.end + p.len + 1; k <= 20; k += 2) ks.add(k); // gap day, then a spotty past
    const blocked = (d) => p.avoid.includes(d.protein_type);
    for (const k of [...ks].sort((a, b) => a - b)) addDay(userId, k, p, blocked, idx);
  });

  real.forEach((userId, idx) => {
    const have = existingDays[userId] ?? new Set();
    const a = avoids[userId] ?? { proteins: new Set(), dishIds: new Set() };
    const blocked = (d) => a.proteins.has(d.protein_type) || a.dishIds.has(d.id);
    for (let k = 1; k <= 14; k++) if (!have.has(dayStr(k))) addDay(userId, k, REAL_POOL, blocked, idx);
  });

  const pair = (a, b, requestedBy, status, accepted) => {
    const [low, high] = a < b ? [a, b] : [b, a];
    return { id: id(low, `friendship:${high}`), user_low: low, user_high: high, requested_by: requestedBy, status, created_at: new Date(now.getTime() - 6 * DAY).toISOString(), accepted_at: accepted ? new Date(now.getTime() - 5 * DAY).toISOString() : null, updated_at: now.toISOString() };
  };
  for (const r of real) {
    for (const u of REAL_FRIENDS) world.friendships.push(pair(r, dummies[u], dummies[u], 'active', true));
    for (const u of PENDING_TO_REAL) world.friendships.push(pair(r, dummies[u], dummies[u], 'pending', false));
  }
  for (const [a, b] of DUMMY_PAIRS) world.friendships.push(pair(dummies[a], dummies[b], dummies[a], 'active', true));

  const goal = (u, name, g) => ({ id: id(dummies[u], `goal:${name}`), user_id: dummies[u], window_days: null, shared: true, reached_at: null, created_at: new Date(todayStart + (g.startK ? -g.startK * DAY : 0)).toISOString(), ...g.row, start_day: dayStr(g.startK) });
  const sana = goal('sana_m', 'streak7', { startK: 9, row: { type: 'streak', target: 7, status: 'reached', reached_at: new Date(now.getTime() - 20 * HOUR).toISOString() } });
  world.goals.push(
    goal('ayesha_k', 'streak14', { startK: 11, row: { type: 'streak', target: 14, status: 'active' } }),
    goal('hamza_a', 'window5', { startK: 4, row: { type: 'window', target: 5, window_days: 7, status: 'active' } }),
    sana,
    goal('zainab_f', 'streak21', { startK: 19, row: { type: 'streak', target: 21, status: 'active' } }),
  );
  for (const u of ['ayesha_k', 'maryam_s']) world.cheers.push({ goal_id: sana.id, user_id: dummies[u], created_at: new Date(now.getTime() - 18 * HOUR).toISOString() });

  const note = (user, name, n) => ({ id: id(user, `note:${name}`), user_id: user, goal_id: null, day: null, read_at: null, ...n });
  for (const r of real) {
    world.notifications.push(
      note(r, 'request', { kind: 'friend_request', actor_id: dummies.danish_q, created_at: new Date(now.getTime() - 3 * HOUR).toISOString() }),
      note(r, 'accepted', { kind: 'request_accepted', actor_id: dummies.maryam_s, created_at: new Date(now.getTime() - DAY).toISOString(), read_at: new Date(now.getTime() - 20 * HOUR).toISOString() }),
      note(r, 'nudge', { kind: 'nudge', actor_id: dummies.hamza_a, day: dayStr(0), created_at: new Date(now.getTime() - 30 * 60_000).toISOString() }),
      note(r, 'reached', { kind: 'goal_reached', actor_id: dummies.sana_m, goal_id: sana.id, created_at: sana.reached_at }),
    );
  }
  return world;
}

const upsertKeys = { profiles: 'id', avoids: 'id', meals: 'id', items: 'id', checkins: 'id', streakDays: 'user_id,day', friendships: 'id', goals: 'id', cheers: 'goal_id,user_id', notifications: 'id' };
const tables = { profiles: 'profiles', avoids: 'user_avoids', meals: 'meals', items: 'meal_items', checkins: 'feel_checkins', streakDays: 'streak_days', friendships: 'friendships', goals: 'goals', cheers: 'goal_cheers', notifications: 'notifications' };

export async function seedDemoWorld({ env, now = new Date(), fetchImpl = fetch, dryRun = false, remove = false }) {
  const url = (env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const call = async (path, init = {}) => {
    const res = await fetchImpl(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    if (!res.ok && !(init.okStatus ?? []).includes(res.status)) throw new Error(`${init.method ?? 'GET'} ${path.split('?')[0]} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };
  const rest = (p, init) => call(`/rest/v1/${p}`, init);

  const { users } = await call('/auth/v1/admin/users?per_page=1000');
  const isDemo = (u) => (u.email ?? '').endsWith(`@${DEMO_DOMAIN}`);
  const real = users.filter((u) => !isDemo(u)).map((u) => u.id);
  const dummies = Object.fromEntries(users.filter(isDemo).map((u) => [u.email.split('@')[0], u.id]));

  if (remove) {
    const world = buildWorld({ dummies: Object.fromEntries(PERSONAS.map((p) => [p.u, dummies[p.u] ?? '00000000-0000-4000-8000-000000000000'])), real, dishes: new Proxy({}, { get: (_, slug) => ({ id: slug, slug, category: 'other', kcal_per_100g: 0, grams_per_unit: 0 }) }), now });
    const sample = world.meals.filter((m) => real.includes(m.user_id));
    if (dryRun) return { dryRun, summary: `would remove ${Object.keys(dummies).length} demo users and ${sample.length} sample meals from real users` };
    for (const u of users.filter(isDemo)) await call(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
    const ids = sample.map((m) => m.id).join(',');
    const found = ids ? await rest(`meals?select=user_id,eaten_at&id=in.(${ids})`) : [];
    if (ids) await rest(`meals?id=in.(${ids})`, { method: 'DELETE' });
    const days = new Map();
    for (const m of found) days.set(m.user_id, [...(days.get(m.user_id) ?? []), m.eaten_at]);
    for (const [userId, times] of days)
      for (const day of new Set(times.map((t) => new Date(new Date(t).getTime() + PKT).toISOString().slice(0, 10)))) {
        const from = new Date(Date.parse(`${day}T00:00:00Z`) - PKT).toISOString();
        const to = new Date(Date.parse(`${day}T00:00:00Z`) - PKT + DAY).toISOString();
        if (!(await rest(`meals?select=id&user_id=eq.${userId}&eaten_at=gte.${from}&eaten_at=lt.${to}&limit=1`)).length) await rest(`streak_days?user_id=eq.${userId}&day=eq.${day}`, { method: 'DELETE' });
      }
    return { dryRun, summary: `removed ${Object.keys(dummies).length} demo users and ${sample.length} sample meals from real users` };
  }

  for (const p of PERSONAS) {
    if (dummies[p.u]) continue;
    if (dryRun) { dummies[p.u] = rowId(p.u, 'dry-run'); continue; }
    const made = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: `${p.u}@${DEMO_DOMAIN}`, email_confirm: true, user_metadata: { demo: true, full_name: p.name } }) });
    dummies[p.u] = made.id;
  }

  const catalog = await rest('dishes?select=id,slug,category,kcal_per_100g,grams_per_unit,protein_type&limit=1000');
  const dishes = Object.fromEntries(catalog.map((d) => [d.slug, d]));
  const avoids = {};
  const existingDays = {};
  if (!dryRun)
    for (const userId of real) {
      const rows = await rest(`user_avoids?select=kind,protein,dish_id&user_id=eq.${userId}`);
      avoids[userId] = { proteins: new Set(rows.filter((r) => r.kind === 'protein').map((r) => r.protein)), dishIds: new Set(rows.filter((r) => r.kind === 'dish').map((r) => r.dish_id)) };
      existingDays[userId] = new Set((await rest(`streak_days?select=day&user_id=eq.${userId}`)).map((r) => r.day));
    }
  const world = buildWorld({ dummies, real, dishes, avoids, existingDays, now });
  const summary = `${Object.keys(dummies).length} demo users, ${world.meals.length} meals, ${world.checkins.length} check-ins, ${world.friendships.length} friendships, ${world.goals.length} goals, ${world.notifications.length} inbox items for ${real.length} real user(s)`;
  if (dryRun) return { dryRun, summary };

  for (const p of world.profiles) { const { id: pid, ...fields } = p; await rest(`profiles?id=eq.${pid}`, { method: 'PATCH', body: JSON.stringify(fields) }); }
  for (const name of Object.keys(tables).filter((t) => t !== 'profiles'))
    if (world[name].length) await rest(`${tables[name]}?on_conflict=${upsertKeys[name]}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(world[name]) });
  return { dryRun, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemoWorld({ env: process.env, dryRun: process.argv.includes('--dry-run'), remove: process.argv.includes('--remove') })
    .then(({ dryRun, summary }) => console.log(`${dryRun ? 'Dry run, nothing written: ' : 'Done: '}${summary}`))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
