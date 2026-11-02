// Local-only v2 smoke: buddy, streak, nudge, feel. Throwaway users, deleted at the end.
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
  for (const n of ['A', 'B', 'C', 'D', 'E']) await makeUser(n);
  const { A: a, B: b, C: c, D: d, E: e } = users;

  const profiles = await admin(`/rest/v1/profiles?select=id&id=in.(${a.id},${b.id})`);
  check('both profiles exist (signup trigger)', profiles.json?.length === 2, show(profiles));

  const inv = await api(a.token, '/api/streaks/invites', { method: 'POST' });
  const code = inv.json?.code;
  check(
    'A creates invite (6 chars A-Z0-9)',
    inv.status === 201 && /^[A-Z0-9]{6}$/.test(code ?? ''),
    show(inv),
  );

  const prev = await api(b.token, `/api/streaks/invites/${code}`);
  const prevText = JSON.stringify(prev.json);
  check(
    'B previews invite, no ids/emails',
    prev.status === 200 &&
      !prevText.includes(a.id) &&
      !prevText.includes('@') &&
      Object.keys(prev.json).sort().join() === 'code,status',
    show(prev),
  );

  const self = await api(a.token, `/api/streaks/invites/${code}/accept`, { method: 'POST' });
  check('self-accept fails', self.status >= 400, show(self));

  const acc = await api(b.token, `/api/streaks/invites/${code}/accept`, { method: 'POST' });
  check('B accepts', acc.status === 204, show(acc));

  const third = await api(c.token, `/api/streaks/invites/${code}/accept`, { method: 'POST' });
  check('C cannot accept used invite', third.status >= 400, show(third));

  const again = await api(b.token, `/api/streaks/invites/${code}/accept`, { method: 'POST' });
  check('second accept fails', again.status >= 400, show(again));

  const bInv = await api(b.token, '/api/streaks/invites', { method: 'POST' });
  check('B cannot invite while paired', bInv.status >= 400, show(bInv));

  // Race: C accepts D's and E's invites at once; at most one pair may become active.
  const dInv = await api(d.token, '/api/streaks/invites', { method: 'POST' });
  const eInv = await api(e.token, '/api/streaks/invites', { method: 'POST' });
  const race = await Promise.all(
    [dInv.json?.code, eInv.json?.code].map((k) =>
      api(c.token, `/api/streaks/invites/${k}/accept`, { method: 'POST' }),
    ),
  );
  const active = await admin(
    `/rest/v1/buddy_pairs?select=id&status=eq.active&or=(inviter_id.eq.${c.id},invitee_id.eq.${c.id})`,
  );
  check(
    'simultaneous accepts leave at most one active pair',
    active.json?.length <= 1 && race.filter((r) => r.status === 204).length <= 1,
    `race=${race.map(show).join(' | ')} active=${show(active)}`,
  );

  const cat = await api(a.token, '/api/nutrition/catalog');
  const slug = cat.json?.dishes?.[0]?.slug;
  check('catalog has a dish', !!slug, show(cat));

  // Nudge before buddy logged: A nudges B (B has not logged).
  const n1 = await api(a.token, '/api/streaks/nudge', { method: 'POST' });
  check('nudge allowed when buddy not logged', n1.status === 204, show(n1));
  const n2 = await api(a.token, '/api/streaks/nudge', { method: 'POST' });
  check('second nudge same day rejected', n2.status >= 400, show(n2));

  const bStat = await api(b.token, '/api/streaks');
  check('B sees unreadNudge', bStat.json?.unreadNudge === true, show(bStat));
  const ack = await api(b.token, '/api/streaks/nudge/ack', { method: 'POST' });
  const bStat2 = await api(b.token, '/api/streaks');
  check(
    'ack clears unreadNudge',
    ack.status === 204 && bStat2.json?.unreadNudge === false,
    `${show(ack)} ${show(bStat2)}`,
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
  check('A ownLoggedToday true', aStat.json?.ownLoggedToday === true, show(aStat));
  const bView = await api(b.token, '/api/streaks');
  check('B sees buddyLoggedToday true', bView.json?.buddyLoggedToday === true, show(bView));
  const keys = 'buddyLoggedToday,ownLoggedToday,pairStatus,pendingInviteCode,streak,unreadNudge';
  check(
    'streaks keys are exactly BuddyStatus',
    Object.keys(bView.json ?? {})
      .sort()
      .join() === keys,
    show(bView),
  );

  const n3 = await api(b.token, '/api/streaks/nudge', { method: 'POST' });
  check('nudge rejected after buddy logged', n3.status >= 400, show(n3));

  // Direct PostgREST with B's JWT against A's rows.
  for (const [table, filter] of [
    ['streak_days', `user_id=eq.${a.id}`],
    ['buddy_pairs', `inviter_id=eq.${a.id}`],
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

  const end = await api(a.token, '/api/streaks/end', { method: 'POST' });
  const aEnd = await api(a.token, '/api/streaks');
  const bEnd = await api(b.token, '/api/streaks');
  check(
    'end pair -> both pairStatus none',
    end.status === 204 && aEnd.json?.pairStatus === 'none' && bEnd.json?.pairStatus === 'none',
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
