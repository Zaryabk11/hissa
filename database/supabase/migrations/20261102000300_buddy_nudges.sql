create table public.buddy_nudges (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.buddy_pairs(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  read_at timestamptz,
  unique(sender_id, day),
  check(sender_id <> recipient_id)
);
alter table public.buddy_nudges enable row level security;
-- All delivery state goes through the minimal authenticated API.
revoke all on public.buddy_nudges from anon, authenticated;
drop policy if exists streak_days_read on public.streak_days;
create policy streak_days_read on public.streak_days for select to authenticated
  using(user_id = (select auth.uid()));

-- Streak repair trusts saved meals, so only the validated backend save (service
-- role) may write them. Owners keep read access; direct-client writes could
-- otherwise leave partial meals that the repair would count as a logged day.
drop policy if exists meals_owner on public.meals;
create policy meals_owner_read on public.meals for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists meal_items_owner on public.meal_items;
create policy meal_items_owner_read on public.meal_items for select to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid())));
revoke insert, update, delete on public.meals, public.meal_items from authenticated;

create function public.buddy_status_operation(actor_id uuid, operation text, target_day date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pair public.buddy_pairs%rowtype;
  buddy_id uuid;
  own_days jsonb;
  buddy_days jsonb := '[]'::jsonb;
  nudged boolean;
begin
  -- ponytail: share the invitation lock for atomic pair lifecycle and nudge checks;
  -- replace with ordered account locks if throughput requires it.
  perform pg_advisory_xact_lock(20261102, 2);
  if actor_id is null or not exists(select 1 from public.profiles where id = actor_id) then
    raise exception 'Invalid actor';
  end if;
  select * into pair from public.buddy_pairs
    where status in ('pending', 'active') and actor_id in (inviter_id, invitee_id);
  if pair.status = 'active' then
    buddy_id := case when pair.inviter_id = actor_id then pair.invitee_id else pair.inviter_id end;
  end if;
  if operation = 'ack' then
    update public.buddy_nudges set read_at = clock_timestamp()
      where recipient_id = actor_id and pair_id = pair.id and read_at is null;
    return null;
  end if;
  if operation not in ('status', 'nudge') or target_day is null then
    raise exception 'Invalid status operation';
  end if;
  -- Repair only real meals with confirmed saved items. An orphan header cannot
  -- count. Access to the second account is authorized by this active pair only.
  insert into public.streak_days(user_id, day)
    select distinct m.user_id, (m.eaten_at at time zone 'Asia/Karachi')::date
    from public.meals m
    where (m.user_id = actor_id or m.user_id = buddy_id)
      and (m.eaten_at at time zone 'Asia/Karachi')::date <= target_day
      and exists(select 1 from public.meal_items i where i.meal_id = m.id and i.confirmed_dish_id is not null)
    on conflict(user_id, day) do nothing;
  select coalesce(jsonb_agg(day), '[]'::jsonb) into own_days
    from public.streak_days where user_id = actor_id and day <= target_day;
  if buddy_id is not null then
    select coalesce(jsonb_agg(day), '[]'::jsonb) into buddy_days
      from public.streak_days where user_id = buddy_id and day <= target_day
        and day >= (pair.accepted_at at time zone 'Asia/Karachi')::date;
  end if;
  select exists(select 1 from public.buddy_nudges where sender_id = actor_id and day = target_day) into nudged;
  if operation = 'nudge' then
    if buddy_id is null or nudged or buddy_days ? target_day::text then
      raise exception 'Nudge unavailable';
    end if;
    insert into public.buddy_nudges(pair_id, sender_id, recipient_id, day)
      values(pair.id, actor_id, buddy_id, target_day);
    return null;
  end if;
  return jsonb_build_object(
    'pairStatus', coalesce(pair.status, 'none'),
    'pendingInviteCode', case when pair.status = 'pending' and pair.inviter_id = actor_id then pair.invite_code else null end,
    'acceptedAt', pair.accepted_at,
    'ownDays', own_days, 'buddyDays', buddy_days, 'nudgedToday', nudged,
    'unreadNudge', exists(select 1 from public.buddy_nudges where recipient_id = actor_id and pair_id = pair.id and read_at is null)
  );
end;
$$;
revoke all on function public.buddy_status_operation(uuid, text, date) from public, anon, authenticated;
grant execute on function public.buddy_status_operation(uuid, text, date) to service_role;
