-- Catalog moves to per-100g nutrition (no FatSecret) and the scan cap gets a log table.

-- Only unverified placeholder dishes exist; this fails loudly if a meal references one.
delete from public.dishes;

alter table public.dishes
  drop constraint dishes_check,
  drop column fatsecret_food_id,
  drop column local_calories,
  drop column local_protein_g,
  drop column local_carbs_g,
  drop column local_fat_g,
  drop constraint dishes_unit_check,
  add constraint dishes_unit_check check (unit in ('roti', 'katori', 'plate', 'piece', 'glass', 'bowl')),
  add column kcal_per_100g numeric not null check (kcal_per_100g > 0),
  add column protein_per_100g numeric not null check (protein_per_100g >= 0),
  add column carbs_per_100g numeric not null check (carbs_per_100g >= 0),
  add column fat_per_100g numeric not null check (fat_per_100g >= 0),
  add column source text not null check (source in ('khan2019', 'farooq2026', 'indb')),
  add column basis text not null check (basis in ('lab', 'calculated')),
  add column unit_basis text not null check (unit_basis in ('derived', 'assumed'));

-- scan_log: one row per Gemini scan, for the daily cap. Only the service role touches it.
create table public.scan_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null, -- the PKT calendar day
  created_at timestamptz not null default now()
);
create index scan_log_user_day_idx on public.scan_log (user_id, day);
alter table public.scan_log enable row level security;
