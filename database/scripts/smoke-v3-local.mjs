// Local-only v3 smoke: avoids, recipes (reviewed gate, avoid filter, not-for-me), v2/v3 cross-check. Throwaway users, deleted at the end.
// Run: node --env-file=backend/.env database/scripts/smoke-v3-local.mjs  (backend must be running against the local stack)
const SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = process.env.API_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
for (const u of [SB, API]) {
  if (!['localhost', '127.0.0.1'].includes(new URL(u).hostname)) {
    console.error(`Refusing to run: ${u} is not a local host`);
    process.exit(2);
  }
}

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` -> ${detail}` : ''}`);
};
const call = async (base, path, { token, key = ANON, method = 'GET', body, headers } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      apikey: key,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
};
const api = (token, path, opts = {}) => call(API, path, { ...opts, token });
const show = (r) => `${r.status} ${JSON.stringify(r.json)}`;
const admin = (path, opts = {}) => call(SB, path, { ...opts, key: SERVICE, token: SERVICE });

const users = {};
async function makeUser(name) {
  const email = `smoke-${name}-${Date.now()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true },
  });
  if (created.status >= 300) throw new Error(`create ${name}: ${show(created)}`);
  const tok = await call(SB, '/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  if (tok.status !== 200) throw new Error(`token ${name}: ${show(tok)}`);
  users[name] = { id: created.json.id, token: tok.json.access_token };
  return users[name];
}

const REVIEWED = ['chicken-biryani', 'chicken-karahi', 'bhindi']; // two chicken, one veg
const UNREVIEWED = 'beef-pulao';
const rid = {};
const ids = (r) => (r.json?.recipes ?? []).map((x) => x.id).sort();
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

try {
  for (const n of ['A', 'B']) await makeUser(n);
  const { A: a, B: b } = users;
  for (const [n, u] of [
    ['a', a],
    ['b', b],
  ]) {
    u.username = `smoke3_${n}_${Date.now().toString(36)}`.slice(0, 20);
    await api(u.token, '/api/profiles/me/username', {
      method: 'PUT',
      body: { username: u.username },
    });
  }

  // --- auth + profile gate
  const noTok = await api(undefined, '/api/recipes');
  check('GET /api/recipes without token -> 401', noTok.status === 401, show(noTok));
  const noTokAv = await api(undefined, '/api/profiles/me/avoids');
  check('GET avoids without token -> 401', noTokAv.status === 401, show(noTokAv));
  const pre = await api(a.token, '/api/recipes');
  check('recipes before profile -> 404', pre.status === 404, show(pre));
  const prof = await api(a.token, '/api/profiles/me', {
    method: 'PUT',
    body: {
      goal: 'maintain',
      sex: 'male',
      age: 30,
      heightCm: 175,
      weightKg: 75,
      activityLevel: 'light',
    },
  });
  check('A saves profile', prof.status < 300, show(prof));
  await api(b.token, '/api/profiles/me', {
    method: 'PUT',
    body: {
      goal: 'maintain',
      sex: 'female',
      age: 28,
      heightCm: 160,
      weightKg: 60,
      activityLevel: 'light',
    },
  });

  // --- avoids
  const av0 = await api(a.token, '/api/profiles/me/avoids');
  check(
    'GET avoids starts empty',
    av0.status === 200 && same(av0.json, { proteins: [], dishes: [] }),
    show(av0),
  );
  const put = await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: ['fish', 'beef', 'fish'], dishes: ['bhindi', 'aloo-gosht', 'bhindi'] },
  });
  const want = { proteins: ['beef', 'fish'], dishes: ['aloo-gosht', 'bhindi'] };
  check('PUT avoids dedupes and sorts', put.status === 200 && same(put.json, want), show(put));
  const get = await api(a.token, '/api/profiles/me/avoids');
  check('GET avoids returns what was saved', same(get.json, want), show(get));
  const badP = await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: ['pork'], dishes: [] },
  });
  check('invalid protein -> 400', badP.status === 400, show(badP));
  const badD = await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: [], dishes: ['no-such-dish'] },
  });
  check('unknown dish -> 400', badD.status === 400, show(badD));
  const still = await api(a.token, '/api/profiles/me/avoids');
  check('failed PUT leaves saved avoids intact', same(still.json, want), show(still));
  const bAv = await api(b.token, '/api/profiles/me/avoids');
  check("B does not see A's avoids", same(bAv.json, { proteins: [], dishes: [] }), show(bAv));
  const clear = await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: [], dishes: [] },
  });
  check(
    'PUT empty clears avoids',
    clear.status === 200 && same(clear.json, { proteins: [], dishes: [] }),
    show(clear),
  );

  // --- recipes: reviewed gate
  const empty = await api(a.token, '/api/recipes');
  check(
    'recipes 200 and empty while all reviewed=false',
    empty.status === 200 && empty.json?.recipes?.length === 0,
    show(empty),
  );
  const slugs = [...REVIEWED, UNREVIEWED].join(',');
  const rows = await admin(`/rest/v1/recipes?select=id,slug&slug=in.(${slugs})`);
  for (const r of rows.json ?? []) rid[r.slug] = r.id;
  check('found seeded recipes', Object.keys(rid).length === 4, show(rows));
  const ids3 = REVIEWED.map((s) => rid[s]).sort();
  const mark = await admin(`/rest/v1/recipes?id=in.(${ids3.join(',')})`, {
    method: 'PATCH',
    body: { reviewed: true },
    headers: { prefer: 'return=minimal' },
  });
  check('mark 3 recipes reviewed (service role)', mark.status === 204, show(mark));

  const list = await api(a.token, '/api/recipes');
  check('list returns exactly the reviewed ones', same(ids(list), ids3), show(list));
  check(
    'list is labelled an estimate',
    list.json?.isEstimate === true && list.json.recipes.every((r) => r.isEstimate === true),
    show(list),
  );
  check(
    'list has remainingCalories number',
    typeof list.json?.remainingCalories === 'number',
    show(list),
  );

  // avoid a protein -> both chicken recipes go, veg stays
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: ['chicken'], dishes: [] },
  });
  const noChicken = await api(a.token, '/api/recipes');
  check(
    'avoiding chicken removes both chicken recipes only',
    same(ids(noChicken), [rid.bhindi]),
    show(noChicken),
  );
  // avoid a dish -> only that dish goes
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: [], dishes: ['bhindi'] },
  });
  const noBhindi = await api(a.token, '/api/recipes');
  check(
    'avoiding dish bhindi removes only bhindi',
    same(ids(noBhindi), [rid['chicken-biryani'], rid['chicken-karahi']].sort()),
    show(noBhindi),
  );
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: [], dishes: [] },
  });

  // --- detail
  const det = await api(a.token, `/api/recipes/${rid.bhindi}`);
  const d = det.json;
  check(
    'detail has ingredients, steps, notForMe=false, avoided=false',
    det.status === 200 &&
      d.ingredients?.length > 0 &&
      d.steps?.length > 0 &&
      d.notForMe === false &&
      d.avoided === false &&
      d.isEstimate === true,
    show(det).slice(0, 300),
  );
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: [], dishes: ['bhindi'] },
  });
  const detAv = await api(a.token, `/api/recipes/${rid.bhindi}`);
  check(
    'detail avoided=true when dish avoided',
    detAv.json?.avoided === true,
    show(detAv).slice(0, 200),
  );
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: [], dishes: [] },
  });
  const unrev = await api(a.token, `/api/recipes/${rid[UNREVIEWED]}`);
  check('unreviewed recipe detail -> 404', unrev.status === 404, show(unrev));
  const ghost = await api(a.token, `/api/recipes/${crypto.randomUUID()}`);
  check('unknown recipe id -> 404', ghost.status === 404, show(ghost));
  const badId = await api(a.token, '/api/recipes/not-a-uuid');
  check('malformed recipe id -> 400', badId.status === 400, show(badId));
  const unrevNfm = await api(a.token, `/api/recipes/${rid[UNREVIEWED]}/not-for-me`, {
    method: 'POST',
  });
  check('not-for-me on unreviewed recipe -> 404', unrevNfm.status === 404, show(unrevNfm));

  // --- not for me
  const nfm = await api(a.token, `/api/recipes/${rid['chicken-biryani']}/not-for-me`, {
    method: 'POST',
  });
  check('POST not-for-me -> 204', nfm.status === 204, show(nfm));
  const nfm2 = await api(a.token, `/api/recipes/${rid['chicken-biryani']}/not-for-me`, {
    method: 'POST',
  });
  check('POST not-for-me twice is idempotent (204)', nfm2.status === 204, show(nfm2));
  const hidden = await api(a.token, '/api/recipes');
  check(
    'hidden recipe leaves the list',
    same(
      ids(hidden),
      ids3.filter((i) => i !== rid['chicken-biryani']),
    ),
    show(hidden),
  );
  const detNfm = await api(a.token, `/api/recipes/${rid['chicken-biryani']}`);
  check('detail shows notForMe=true', detNfm.json?.notForMe === true, show(detNfm).slice(0, 200));
  const bList = await api(b.token, '/api/recipes');
  check("A's not-for-me does not affect B", same(ids(bList), ids3), show(bList));
  const undo = await api(a.token, `/api/recipes/${rid['chicken-biryani']}/not-for-me`, {
    method: 'DELETE',
  });
  check('DELETE not-for-me -> 204', undo.status === 204, show(undo));
  const back = await api(a.token, '/api/recipes');
  check('recipe is back after DELETE', same(ids(back), ids3), show(back));
  const undo2 = await api(a.token, `/api/recipes/${rid['chicken-biryani']}/not-for-me`, {
    method: 'DELETE',
  });
  check('DELETE not-for-me when not set -> 204', undo2.status === 204, show(undo2));

  // direct PostgREST: B's JWT must not read A's avoids / not-for-me rows
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: ['fish'], dishes: [] },
  });
  await api(a.token, `/api/recipes/${rid.bhindi}/not-for-me`, { method: 'POST' });
  for (const [t, f] of [
    ['user_avoids', `user_id=eq.${a.id}`],
    ['recipe_feedback', `user_id=eq.${a.id}`],
  ]) {
    const r = await call(SB, `/rest/v1/${t}?select=*&${f}`, { token: b.token });
    check(
      `B cannot read A's ${t}`,
      (r.status === 200 && r.json.length === 0) || [401, 403, 404].includes(r.status),
      show(r),
    );
  }

  // --- scan carries `avoided` only when Gemini answers; local stack has no Gemini
  console.log(
    'SKIP POST /api/scan items carry avoided (needs a live Gemini call; covered by scan unit tests)',
  );

  // --- cross-feature: friends + avoids + saved meal
  const req = await api(a.token, '/api/friends/requests', {
    method: 'POST',
    body: { username: b.username },
  });
  const acc = await api(b.token, `/api/friends/requests/${a.id}/accept`, { method: 'POST' });
  check(
    'A and B become friends',
    req.status === 204 && acc.status === 204,
    `${show(req)} ${show(acc)}`,
  );
  await api(a.token, '/api/profiles/me/avoids', {
    method: 'PUT',
    body: { proteins: ['chicken'], dishes: ['bhindi'] },
  });
  const cat = await api(a.token, '/api/nutrition/catalog');
  const avoidedDish = cat.json.dishes.find((x) => x.slug === 'chicken-biryani');
  const meal = await api(a.token, '/api/meals', {
    method: 'POST',
    body: {
      items: [
        {
          predictedDish: null,
          predictedPortion: null,
          confirmedDish: avoidedDish.slug,
          confirmedPortion: 1,
          confidence: null,
        },
      ],
    },
  });
  check('A saves a meal of an avoided dish (avoids are advisory)', meal.status === 201, show(meal));
  const st = await api(a.token, '/api/streaks');
  check(
    'A /api/streaks correct with avoids set',
    st.status === 200 && st.json?.streak === 1 && st.json?.loggedToday === true,
    show(st),
  );
  const ov = await api(b.token, '/api/friends/overview');
  const row = ov.json?.friends?.find((f) => f.userId === a.id);
  check(
    'B /api/friends/overview shows A logged, streak 1, only shared fields',
    row?.loggedToday === true &&
      row.streak === 1 &&
      Object.keys(row).sort().join() ===
        'displayName,loggedToday,nudgedToday,streak,userId,username',
    show(ov),
  );
  check(
    'overview/streaks leak no avoids',
    !JSON.stringify(ov.json).includes('chicken') && !JSON.stringify(ov.json).includes('avoid'),
    show(ov),
  );
  const aList = await api(a.token, '/api/recipes');
  check(
    'recipes after a meal: remainingCalories drops by the meal and avoided dish/protein stay hidden',
    aList.status === 200 &&
      prof.json.dailyCalorieBudget - aList.json.remainingCalories === meal.json.totalCalories &&
      aList.json.recipes.every((r) => r.proteinType !== 'chicken' && r.dish !== 'bhindi'),
    show(aList).slice(0, 300),
  );
  const ins = await call(SB, '/rest/v1/recipe_feedback', {
    token: b.token,
    method: 'POST',
    body: { user_id: b.id, recipe_id: rid.bhindi, verdict: 'not_for_me' },
  });
  check('direct insert into recipe_feedback rejected', ins.status >= 400, show(ins));
} catch (err) {
  failed++;
  console.log(`FAIL aborted: ${err.message}`);
} finally {
  if (Object.keys(rid).length)
    await admin('/rest/v1/recipes?reviewed=eq.true', {
      method: 'PATCH',
      body: { reviewed: false },
      headers: { prefer: 'return=minimal' },
    });
  for (const [n, u] of Object.entries(users)) {
    const r = await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
    if (r.status >= 300) console.log(`WARN could not delete user ${n}: ${r.status}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAIL`}`);
  process.exit(failed ? 1 : 0);
}
