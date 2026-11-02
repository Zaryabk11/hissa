-- Keep each observation on its whole meal; nullable provenance is reserved for
-- the later adaptive question slice.
alter table public.feel_checkins
  add column if not exists symptom text check (symptom in ('bloated', 'upset', 'other', 'not_sure')),
  add column if not exists question_type text,
  add column if not exists answer_id text,
  add column if not exists question_source text;

-- Enforce ownership even for direct client writes and service-role callers.
create unique index if not exists meals_id_user_id_idx on public.meals(id, user_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'feel_checkins_meal_owner_fkey'
    and conrelid = 'public.feel_checkins'::regclass) then
    alter table public.feel_checkins add constraint feel_checkins_meal_owner_fkey
      foreign key (meal_id, user_id) references public.meals(id, user_id) on delete cascade;
  end if;
end $$;

-- Check-ins are written only by the backend, which enforces the 90 minute to 24 hour
-- window. Owners keep read access.
drop policy if exists feel_checkins_owner on public.feel_checkins;
drop policy if exists feel_checkins_read on public.feel_checkins;
create policy feel_checkins_read on public.feel_checkins for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.feel_checkins from anon, authenticated;
