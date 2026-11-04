-- Friends, goals and notifications replace the one-buddy pairs. Backend (service role) only.
alter table public.profiles
  add column username text unique check (username ~ '^[a-z0-9_]{3,20}$');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  check (user_low < user_high),
  unique (user_low, user_high)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('streak', 'window')),
  target integer not null,
  window_days integer,
  start_day date not null,
  status text not null check (status in ('active', 'reached', 'abandoned', 'expired')),
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  reached_at timestamptz
);
create unique index goals_one_active_per_user on public.goals (user_id) where status = 'active';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('friend_request', 'request_accepted', 'nudge', 'goal_reached', 'cheer')),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  day date,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (kind <> 'nudge' or day is not null)
);
create unique index notifications_one_nudge_per_day on public.notifications (actor_id, user_id, day) where kind = 'nudge';

create table public.goal_cheers (
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, user_id)
);

alter table public.friendships enable row level security;
alter table public.notifications enable row level security;
alter table public.goals enable row level security;
alter table public.goal_cheers enable row level security;
revoke all on public.friendships, public.notifications, public.goals, public.goal_cheers from anon, authenticated;

-- Active buddies become friends; pending invites are dropped.
insert into public.friendships (user_low, user_high, requested_by, status, created_at, accepted_at)
  select least(inviter_id, invitee_id), greatest(inviter_id, invitee_id), inviter_id, 'active', created_at, accepted_at
  from public.buddy_pairs where status = 'active' and invitee_id is not null
  on conflict do nothing;

-- The old status call repaired streak_days lazily; do it once for everyone before it goes.
-- Only meals with a confirmed dish count, on the Asia/Karachi calendar day.
insert into public.streak_days (user_id, day)
  select distinct m.user_id, (m.eaten_at at time zone 'Asia/Karachi')::date
  from public.meals m
  where exists (select 1 from public.meal_items i where i.meal_id = m.id and i.confirmed_dish_id is not null)
  on conflict (user_id, day) do nothing;

drop function public.buddy_invite_operation(uuid, text, text);
drop function public.buddy_status_operation(uuid, text, date);
drop table public.buddy_nudges;
drop table public.buddy_pairs;
