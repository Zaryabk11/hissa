// Local-only v2 smoke: friends, streak, nudge, goals, notifications, feel. Throwaway users, deleted at the end.
// Run: node --env-file=backend/.env database/scripts/smoke-v2-local.mjs  (backend must be running)
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

try {
  for (const n of ['A', 'B', 'C']) await makeUser(n);
  const { A: a, B: b, C: c } = users;

  const profiles = await admin(`/rest/v1/profiles?select=id&id=in.(${a.id},${b.id})`);
  check('both profiles exist (signup trigger)', profiles.json?.length === 2, show(profiles));

  for (const [n, u] of [
    ['a', a],
    ['b', b],
    ['c', c],
  ]) {
    u.username = `smoke_${n}_${Date.now().toString(36)}`.slice(0, 20);
    const r = await api(u.token, '/api/profiles/me/username', {
      method: 'PUT',
      body: { username: u.username },
    });
    check(`${n} sets a username`, r.status < 300, show(r));
  }

  const req = await api(a.token, '/api/friends/requests', {
    method: 'POST',
    body: { username: b.username },
  });
  check('A requests B by username', req.status === 204, show(req));

  const selfReq = await api(a.token, '/api/friends/requests', {
    method: 'POST',
    body: { username: a.username },
  });
  check('self-request fails', selfReq.status >= 400, show(selfReq));

  const bOver = await api(b.token, '/api/friends/overview');
  check(
    'B sees A as an incoming request',
    bOver.json?.incoming?.some((p) => p.userId === a.id),
    show(bOver),
  );

  const stranger = await api(c.token, `/api/friends/requests/${a.id}/accept`, { method: 'POST' });
  check('C cannot accept a request not sent to C', stranger.status >= 400, show(stranger));

  const acc = await api(b.token, `/api/friends/requests/${a.id}/accept`, { method: 'POST' });
  check('B accepts', acc.status === 204, show(acc));

  const again = await api(b.token, `/api/friends/requests/${a.id}/accept`, { method: 'POST' });
  check('second accept fails', again.status >= 400, show(again));

  const cat = await api(a.token, '/api/nutrition/catalog');
  const slug = cat.json?.dishes?.[0]?.slug;
  check('catalog has a dish', !!slug, show(cat));

  // Nudge before the friend logged: A nudges B (B has not logged).
  const n1 = await api(a.token, `/api/friends/${b.id}/nudge`, { method: 'POST' });
  check('nudge allowed when friend not logged', n1.status === 204, show(n1));
  const n2 = await api(a.token, `/api/friends/${b.id}/nudge`, { method: 'POST' });
  check('second nudge same day rejected', n2.status >= 400, show(n2));

  const bNotes = await api(b.token, '/api/notifications');
  check(
    'B has an unread nudge in the inbox',
    bNotes.json?.items?.some((i) => i.kind === 'nudge' && !i.read),
    show(bNotes),
  );
  const ack = await api(b.token, '/api/notifications/read', { method: 'POST' });
  const bNotes2 = await api(b.token, '/api/notifications');
  check(
    'mark read clears unread',
    ack.status === 204 && bNotes2.json?.unread === 0,
    `${show(ack)} ${show(bNotes2)}`,
  );

  const item = {
    predictedDish: null,
    predictedPortion: null,
    confirmedDish: slug,
    confirmedPortion: 1,
    confidence: null,
  };
  const meal = await api(a.token, '/api/meals', { method: 'POST', body: { items: [item] } });
  const mealId = meal.json?.id;
  check('A saves meal', meal.status === 201 && !!mealId, show(meal));

  const aStat = await api(a.token, '/api/streaks');
  check('A loggedToday true', aStat.json?.loggedToday === true, show(aStat));
  const bView = await api(b.token, '/api/friends/overview');
  const aRow = bView.json?.friends?.find((f) => f.userId === a.id);
  check('B sees A loggedToday true', aRow?.loggedToday === true, show(bView));
  const keys = 'displayName,loggedToday,nudgedToday,streak,userId,username';
  check(
    'friend row has exactly the shared fields',
    Object.keys(aRow ?? {})
      .sort()
      .join() === keys,
    show(bView),
  );

  const n3 = await api(b.token, `/api/friends/${a.id}/nudge`, { method: 'POST' });
  check('nudge rejected after friend logged', n3.status >= 400, show(n3));

  const goal = await api(a.token, '/api/goals', {
    method: 'POST',
    body: { type: 'streak', target: 7, shared: true },
  });
  check('A creates a shared goal', goal.status === 201, show(goal));

  // Direct PostgREST with B's JWT against A's rows.
  for (const [table, filter] of [
    ['streak_days', `user_id=eq.${a.id}`],
    ['friendships', `user_low=eq.${a.id}`],
    ['goals', `user_id=eq.${a.id}`],
    ['notifications', `user_id=eq.${a.id}`],
    ['meals', `user_id=eq.${a.id}`],
    ['meal_items', `meal_id=eq.${mealId}`],
    ['feel_checkins', `user_id=eq.${a.id}`],
  ]) {
    const r = await call(SB, `/rest/v1/${table}?select=*&${filter}`, { token: b.token });
    check(
      `B cannot read A's ${table}`,
      (r.status === 200 && r.json.length === 0) || [401, 403].includes(r.status),
      show(r),
    );
  }
  const insMeal = await call(SB, '/rest/v1/meals', {
    token: b.token,
    method: 'POST',
    body: { user_id: b.id },
  });
  check('direct insert into meals rejected', insMeal.status >= 400, show(insMeal));
  const own = await api(b.token, '/api/meals', { method: 'POST', body: { items: [item] } });
  const insItem = await call(SB, '/rest/v1/meal_items', {
    token: b.token,
    method: 'POST',
    body: { meal_id: own.json?.id, confirmed_dish_id: cat.json.dishes[0].id, confirmed_portion: 1 },
  });
  check(
    'direct insert into meal_items rejected',
    own.status === 201 && insItem.status >= 400,
    `${show(own)} ${show(insItem)}`,
  );

  // Feel check-in.
  const due0 = await api(a.token, '/api/feel/due');
  check('just-saved meal not due', due0.status === 200 && due0.json === null, show(due0));
  const back = await admin(`/rest/v1/meals?id=eq.${mealId}`, {
    method: 'PATCH',
    body: { eaten_at: new Date(Date.now() - 100 * 60_000).toISOString() },
    headers: { prefer: 'return=minimal' },
  });
  const due1 = await api(a.token, '/api/feel/due');
  check(
    'backdated meal becomes due',
    back.status === 204 && due1.json?.mealId === mealId,
    `${show(back)} ${show(due1)}`,
  );
  const ans = { mealId, energy: 'good', stomach: 'fine' };
  const ci1 = await api(a.token, '/api/feel/checkins', { method: 'POST', body: ans });
  check('check-in saves', ci1.status >= 200 && ci1.status < 300, show(ci1));
  const ci2 = await api(a.token, '/api/feel/checkins', { method: 'POST', body: ans });
  check('second check-in same meal rejected', ci2.status >= 400, show(ci2));
  const ci3 = await api(b.token, '/api/feel/checkins', { method: 'POST', body: ans });
  check("check-in on another user's meal rejected", ci3.status >= 400, show(ci3));

  const end = await api(a.token, `/api/friends/${b.id}`, { method: 'DELETE' });
  const aEnd = await api(a.token, '/api/friends/overview');
  const bEnd = await api(b.token, '/api/friends/overview');
  check(
    'remove friend -> both friend lists empty',
    end.status === 204 && aEnd.json?.friends?.length === 0 && bEnd.json?.friends?.length === 0,
    `${show(end)} ${show(aEnd)} ${show(bEnd)}`,
  );
} catch (err) {
  failed++;
  console.log(`FAIL aborted: ${err.message}`);
} finally {
  for (const [n, u] of Object.entries(users)) {
    const r = await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
    if (r.status >= 300) console.log(`WARN could not delete user ${n}: ${r.status}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAIL`}`);
  process.exit(failed ? 1 : 0);
}
