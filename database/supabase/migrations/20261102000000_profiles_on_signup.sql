-- Every signed-in user needs a profiles row: meals and scan_log reference profiles(id).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this trigger existed.
insert into public.profiles (id) select id from auth.users on conflict do nothing;
