-- Hissa initial schema. All tables have RLS on. The backend uses the service role
-- (bypasses RLS), so these policies protect direct client access to Supabase.

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  goal text check (goal in ('lose', 'maintain')),
  sex text check (sex in ('male', 'female')), -- Mifflin-St Jeor needs it; the PRD onboarding omits it
  age integer check (age between 10 and 120),
  height_cm numeric check (height_cm > 0),
  weight_kg numeric check (weight_kg > 0),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  daily_calorie_budget integer check (daily_calorie_budget > 0), -- an estimate
  created_at timestamptz not null default now()
);

-- dishes: shared catalog (reference data, not user-owned) -----------------------
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- the value Gemini may answer with
  name text not null,
  category text not null check (category in ('rice', 'roti', 'fried', 'lentil', 'meat', 'sweets', 'other')),
  unit text not null check (unit in ('roti', 'katori', 'plate', 'piece', 'glass')),
  grams_per_unit numeric not null check (grams_per_unit > 0),
  fatsecret_food_id text, -- null: use the local values below
  local_calories numeric, -- per one unit
  local_protein_g numeric,
  local_carbs_g numeric,
  local_fat_g numeric,
  check (fatsecret_food_id is not null or local_calories is not null)
);

-- meals ---------------------------------------------------------------------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  eaten_at timestamptz not null default now(),
  photo_path text,
  total_calories numeric, -- an estimate
  created_at timestamptz not null default now()
);
create index meals_user_eaten_idx on public.meals (user_id, eaten_at desc);

-- meal_items: predicted vs confirmed values, kept as future training data -------
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  predicted_dish_id uuid references public.dishes (id), -- null when the user added a dish
  confirmed_dish_id uuid references public.dishes (id), -- null when the user removed it
  predicted_portion numeric,
  confirmed_portion numeric,
  confidence numeric check (confidence between 0 and 1),
  check (predicted_dish_id is not null or confirmed_dish_id is not null)
);
create index meal_items_meal_idx on public.meal_items (meal_id);

-- buddy_pairs ---------------------------------------------------------------
create table public.buddy_pairs (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid references public.profiles (id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (invitee_id is null or invitee_id <> inviter_id)
);
-- One buddy at a time. A user being inviter in one pair and invitee in another is checked in the service.
create unique index buddy_pairs_one_open_per_inviter on public.buddy_pairs (inviter_id) where status in ('pending', 'active');
create unique index buddy_pairs_one_active_per_invitee on public.buddy_pairs (invitee_id) where status = 'active';

-- streak_days: one row per person per PKT day with at least one saved meal -----
create table public.streak_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null, -- the PKT calendar day
  primary key (user_id, day)
);

-- feel_checkins ---------------------------------------------------------------
create table public.feel_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid not null unique references public.meals (id) on delete cascade,
  energy text not null check (energy in ('low', 'okay', 'good')),
  stomach text not null check (stomach in ('heavy', 'fine', 'light')),
  created_at timestamptz not null default now()
);

-- Row level security ----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.dishes enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.buddy_pairs enable row level security;
alter table public.streak_days enable row level security;
alter table public.feel_checkins enable row level security;

create policy profiles_owner on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Catalog is readable by any signed-in user; only the service role writes it.
create policy dishes_read on public.dishes for select to authenticated using (true);

create policy meals_owner on public.meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy meal_items_owner on public.meal_items for all to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));

create policy feel_checkins_owner on public.feel_checkins for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Pairs: only the two people in them. Accepting a code is done by the backend (service role).
create policy buddy_pairs_participants_read on public.buddy_pairs for select to authenticated
  using ((select auth.uid()) in (inviter_id, invitee_id));
create policy buddy_pairs_inviter_insert on public.buddy_pairs for insert to authenticated
  with check (inviter_id = (select auth.uid()) and status = 'pending');
create policy buddy_pairs_participants_update on public.buddy_pairs for update to authenticated
  using ((select auth.uid()) in (inviter_id, invitee_id))
  with check ((select auth.uid()) in (inviter_id, invitee_id));

-- Streak days: the owner and an active buddy can read; only the backend writes, so a
-- client cannot fake a day. Meals, photos and calories are never exposed to the buddy.
create policy streak_days_read on public.streak_days for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.buddy_pairs p
      where p.status = 'active'
        and ((p.inviter_id = (select auth.uid()) and p.invitee_id = streak_days.user_id)
          or (p.invitee_id = (select auth.uid()) and p.inviter_id = streak_days.user_id))
    )
  );
