-- One private "try next time" choice per weekly pattern card. Written only by the backend (decision
-- 0006); owners keep read access. Stores what was chosen and the later meal the user says they tried
-- it with, so a later check-in can be compared. It records no cause and no outcome.
create table if not exists public.user_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pattern_key text not null,
  action text not null check (action in ('smaller_portion', 'different_side', 'observe_again')),
  status text not null default 'active' check (status in ('active', 'tried')),
  created_at timestamptz not null default now(),
  tried_at timestamptz,
  tried_meal_id uuid,
  check (status = 'active' or tried_at is not null),
  -- The tried meal must belong to the same user. If that meal is deleted only the link is cleared.
  constraint user_experiments_tried_meal_owner_fkey foreign key (tried_meal_id, user_id)
    references public.meals (id, user_id) on delete set null (tried_meal_id)
);

-- At most one active experiment per user; tried ones are kept as history.
create unique index if not exists user_experiments_one_active_idx
  on public.user_experiments (user_id) where status = 'active';
create index if not exists user_experiments_user_created_idx
  on public.user_experiments (user_id, created_at desc);

alter table public.user_experiments enable row level security;
drop policy if exists user_experiments_read on public.user_experiments;
create policy user_experiments_read on public.user_experiments for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_experiments from anon, authenticated;
