-- v3: per-user avoid list (a dish or a protein type) and reviewed recipes with "not for me" feedback.
-- Written only by the backend (service role); owners keep read access. Recipes are read-only reference data.
alter table public.dishes add column if not exists protein_type text
  check (protein_type in ('beef', 'mutton', 'chicken', 'fish', 'egg', 'veg'));

create table if not exists public.user_avoids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('dish', 'protein')),
  dish_id uuid references public.dishes (id),
  protein text check (protein in ('beef', 'mutton', 'chicken', 'fish', 'egg', 'veg')),
  created_at timestamptz not null default now(),
  check (
    (kind = 'dish' and dish_id is not null and protein is null)
    or (kind = 'protein' and protein is not null and dish_id is null)
  )
);
create unique index if not exists user_avoids_user_dish_idx on public.user_avoids (user_id, dish_id);
create unique index if not exists user_avoids_user_protein_idx on public.user_avoids (user_id, protein);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  dish_id uuid not null references public.dishes (id),
  minutes int not null check (minutes > 0),
  servings int not null check (servings > 0),
  ingredients jsonb not null,
  steps jsonb not null,
  reviewed boolean not null default false
);

create table if not exists public.recipe_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  verdict text not null check (verdict = 'not_for_me'),
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.user_avoids enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_feedback enable row level security;

drop policy if exists user_avoids_owner_read on public.user_avoids;
create policy user_avoids_owner_read on public.user_avoids for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists recipes_read on public.recipes;
create policy recipes_read on public.recipes for select to authenticated using (reviewed);
drop policy if exists recipe_feedback_owner_read on public.recipe_feedback;
create policy recipe_feedback_owner_read on public.recipe_feedback for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.user_avoids from anon, authenticated;
revoke insert, update, delete on public.recipes from anon, authenticated;
revoke insert, update, delete on public.recipe_feedback from anon, authenticated;

-- Backfill existing databases (seed.sql sets the same values on a fresh one).
update public.dishes set protein_type = 'beef'
  where slug in ('beef-korma', 'beef-pulao', 'beef-biryani', 'beef-karahi', 'nihari', 'haleem', 'kachalo-qeema', 'karela-qeema', 'shimla-mirch-qeema', 'macaroni-qeema', 'keema', 'kofta', 'chapli-kebab', 'seekh-kebab', 'paye');
update public.dishes set protein_type = 'mutton'
  where slug in ('aloo-gosht', 'mutton-karahi', 'mutton-biryani', 'mutton-pulao', 'kaleji', 'palak-gosht');
update public.dishes set protein_type = 'chicken'
  where slug in ('chicken-biryani', 'chicken-karahi', 'chicken-pulao', 'chicken-korma', 'chicken-tikka', 'malai-boti');
update public.dishes set protein_type = 'fish'
  where slug in ('machli', 'fish-curry');
update public.dishes set protein_type = 'egg'
  where slug in ('egg-fried-rice', 'anda-paratha');
update public.dishes set protein_type = 'veg'
  where slug in ('baingan', 'bhindi', 'chana-daal', 'vegetable-rice', 'choley', 'daal-kaddu', 'maash-daal', 'kadhi-pakora', 'lobia', 'mixed-daal', 'mixed-sabzi', 'palak', 'tori', 'khichdi', 'matar-rice', 'saag', 'aloo-baingan', 'ghiya', 'karela', 'aloo-methi', 'aloo-palak', 'samosa', 'pakode');
