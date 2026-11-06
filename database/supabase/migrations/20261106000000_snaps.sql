-- Snaps (view-once meal photos), reports and the streak cheer. Backend (service role) only.
create table public.snaps (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid unique references public.meals(id) on delete set null,
  object_path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  deleted_at timestamptz
);

create table public.snap_recipients (
  snap_id uuid not null references public.snaps(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  audience text not null default 'friend' check (audience in ('friend', 'follower')),
  expires_at timestamptz not null,
  opened_at timestamptz,
  primary key (snap_id, recipient_id)
);
create index snap_recipients_unopened_idx on public.snap_recipients (recipient_id) where opened_at is null;

-- snap_id has no FK: a report outlives the deleted snap.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  snap_id uuid,
  reason text not null check (reason in ('spam', 'inappropriate_photo', 'harassment', 'other')),
  created_at timestamptz not null default now(),
  evidence_path text,
  evidence_expires_at timestamptz,
  unique (reporter_id, snap_id)
);

alter table public.snaps enable row level security;
alter table public.snap_recipients enable row level security;
alter table public.reports enable row level security;
revoke all on public.snaps, public.snap_recipients, public.reports from anon, authenticated;

-- Streak cheer: one per actor, user and day, like nudges.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications drop constraint if exists notifications_check;
alter table public.notifications
  add constraint notifications_kind_check
    check (kind in ('friend_request', 'request_accepted', 'nudge', 'goal_reached', 'cheer', 'cheer_streak')),
  add constraint notifications_check
    check (kind not in ('nudge', 'cheer_streak') or day is not null);
create unique index notifications_one_cheer_streak_per_day on public.notifications (actor_id, user_id, day) where kind = 'cheer_streak';

-- Snap photos now live in the private snaps bucket, not on the meal.
alter table public.meals drop column photo_path;

-- No signed URLs: the backend streams bytes. 1 MB, JPEG only.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('snaps', 'snaps', false, 1048576, array['image/jpeg']),
           ('snap-reports', 'snap-reports', false, 1048576, array['image/jpeg'])
    on conflict (id) do nothing;
  end if;
end $$;
