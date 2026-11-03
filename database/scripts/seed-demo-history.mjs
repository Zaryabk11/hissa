// Seeds two weeks of SAMPLE meals and check-ins for ONE designated demo-only Supabase user, so the
// weekly pattern card can be shown. Sample data only: it is invented, not a person's real history.
//
//   DEMO_USER_ID=<uuid> SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
//     node database/scripts/seed-demo-history.mjs [--dry-run]
//
// The user must already exist (sign in once with the demo-only Google account). This script never
// creates or stores credentials and reads the service key from the environment only. Re-running is
// safe: every row id is derived from the user id, so rows are updated in place, never duplicated.
// Set the same id as DEMO_USER_ID on the backend so the card is labelled as sample data.
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOUR = 3_600_000;
const PKT_OFFSET = 5 * HOUR;
export const DAYS = 14;

export function readTarget(env) {
  const userId = (env.DEMO_USER_ID ?? '').trim();
  if (!UUID.test(userId))
    throw new Error("Set DEMO_USER_ID to the demo-only account's Supabase user id (a UUID).");
  const url = (env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url || !key)
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  return { userId, url, key };
}

// Deterministic, valid-looking UUID per (user, row), so a re-run hits the same rows.
function rowId(userId, name) {
  const h = createHash('sha1').update(`hissa-demo-history:${userId}:${name}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Two meals a day for the last 14 PKT days (not today). Lunch is mostly chicken biryani with a heavy
// stomach, so the last seven days support a rice pattern; dinners stay unremarkable.
export function buildDemoHistory(userId, now = new Date()) {
  const pktToday = Math.floor((now.getTime() + PKT_OFFSET) / (24 * HOUR)) * 24 * HOUR - PKT_OFFSET;
  const meals = [];
  const items = [];
  const checkins = [];
  for (let d = 1; d <= DAYS; d++) {
    const plan = [
      {
        slot: 'lunch',
        hourPkt: 13,
        slug: d % 7 === 3 ? 'mixed-daal' : 'chicken-biryani',
        stomach: d % 7 === 3 || d % 7 === 5 ? 'fine' : 'heavy',
        energy: 'okay',
      },
      {
        slot: 'dinner',
        hourPkt: 20,
        slug: d % 2 === 0 ? 'mixed-daal' : 'chicken-karahi',
        stomach: 'fine',
        energy: d === 2 ? 'good' : 'okay',
      },
    ];
    for (const p of plan) {
      const eaten = pktToday - (d - 1) * 24 * HOUR - 24 * HOUR + p.hourPkt * HOUR;
      const mealId = rowId(userId, `meal:${d}:${p.slot}`);
      meals.push({
        id: mealId,
        user_id: userId,
        eaten_at: new Date(eaten).toISOString(),
        created_at: new Date(eaten).toISOString(),
      });
      items.push({
        id: rowId(userId, `item:${d}:${p.slot}`),
        meal_id: mealId,
        slug: p.slug,
        confirmed_portion: 1,
      });
      checkins.push({
        id: rowId(userId, `checkin:${d}:${p.slot}`),
        user_id: userId,
        meal_id: mealId,
        energy: p.energy,
        stomach: p.stomach,
        created_at: new Date(eaten + 3 * HOUR).toISOString(),
      });
    }
  }
  return { meals, items, checkins };
}

export async function seedDemoHistory({
  env,
  now = new Date(),
  fetchImpl = fetch,
  dryRun = false,
}) {
  const { userId, url, key } = readTarget(env);
  const history = buildDemoHistory(userId, now);
  const summary = `${history.meals.length} sample meals, ${history.checkins.length} sample check-ins for user ${userId}`;
  if (dryRun) return { dryRun: true, summary };

  const call = async (path, init = {}) => {
    const res = await fetchImpl(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!res.ok)
      throw new Error(`${init.method ?? 'GET'} ${path.split('?')[0]} failed: ${res.status}`);
    return init.method === 'POST' ? null : res.json();
  };
  const upsert = (table, rows) =>
    call(`${table}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });

  // The account must already exist: this script never creates users or credentials.
  const profile = await call(`profiles?select=id&id=eq.${userId}`);
  if (profile.length !== 1)
    throw new Error(`No Supabase user ${userId}. Sign in with the demo account first.`);
  const slugs = [...new Set(history.items.map((i) => i.slug))];
  const dishes = await call(`dishes?select=id,slug&slug=in.(${slugs.join(',')})`);
  const dishId = Object.fromEntries(dishes.map((d) => [d.slug, d.id]));
  for (const slug of slugs)
    if (!dishId[slug])
      throw new Error(`Dish "${slug}" is not in the catalog. Seed the catalog first.`);

  await upsert('meals', history.meals);
  await upsert(
    'meal_items',
    history.items.map(({ slug, ...item }) => ({
      ...item,
      predicted_dish_id: dishId[slug],
      confirmed_dish_id: dishId[slug],
      predicted_portion: 1,
    })),
  );
  await upsert('feel_checkins', history.checkins);
  return { dryRun: false, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemoHistory({ env: process.env, dryRun: process.argv.includes('--dry-run') })
    .then(({ dryRun, summary }) =>
      console.log(`${dryRun ? 'Dry run, nothing written: ' : 'Seeded SAMPLE data: '}${summary}`),
    )
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
