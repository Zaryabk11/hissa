-- All pair mutations go through a service-only transaction. A single lock is
-- deliberately sufficient for this small app and serializes cross-role races.
alter table public.buddy_pairs drop constraint buddy_pairs_status_check;
alter table public.buddy_pairs add constraint buddy_pairs_status_check
  check (status in ('pending', 'active', 'ended', 'declined'));
drop policy buddy_pairs_inviter_insert on public.buddy_pairs;
drop policy buddy_pairs_participants_update on public.buddy_pairs;
revoke insert, update, delete on public.buddy_pairs from anon, authenticated;

drop policy streak_days_read on public.streak_days;
create policy streak_days_read on public.streak_days for select to authenticated
  using (user_id = (select auth.uid()));

create function public.buddy_invite_operation(actor_id uuid, operation text, code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pair public.buddy_pairs%rowtype;
begin
  perform pg_advisory_xact_lock(20261102, 2);
  if actor_id is null or not exists (select 1 from public.profiles where id = actor_id) then
    raise exception 'Invalid actor';
  end if;
  if operation = 'end' then
    update public.buddy_pairs set status = 'ended'
      where status in ('pending', 'active') and actor_id in (inviter_id, invitee_id);
    return null;
  end if;
  if code is null or code !~ '^[A-Z0-9]{6}$' then raise exception 'Invalid code'; end if;
  if operation = 'create' then
    if exists (select 1 from public.buddy_pairs where status in ('pending', 'active')
      and actor_id in (inviter_id, invitee_id)) then raise exception 'Already paired'; end if;
    insert into public.buddy_pairs(inviter_id, invite_code) values (actor_id, code);
    return null;
  end if;
  select * into pair from public.buddy_pairs where invite_code = code;
  if not found or pair.status <> 'pending' or pair.inviter_id = actor_id then
    raise exception 'Invitation unavailable';
  end if;
  if exists (select 1 from public.buddy_pairs where status in ('pending', 'active')
    and actor_id in (inviter_id, invitee_id)) then raise exception 'Already paired'; end if;
  if operation = 'preview' then
    return jsonb_build_object('code', pair.invite_code, 'status', 'pending');
  elsif operation = 'accept' then
    -- Check inviter across both roles as well as recipient. The invite itself
    -- is excluded; accepted_at is fresh for each new pair's streak boundary.
    if exists (select 1 from public.buddy_pairs where id <> pair.id
      and status in ('pending', 'active') and pair.inviter_id in (inviter_id, invitee_id)) then
      raise exception 'Already paired';
    end if;
    update public.buddy_pairs set invitee_id = actor_id, status = 'active', accepted_at = clock_timestamp()
      where id = pair.id and status = 'pending';
  elsif operation = 'decline' then
    update public.buddy_pairs set invitee_id = actor_id, status = 'declined'
      where id = pair.id and status = 'pending';
  else raise exception 'Invalid operation';
  end if;
  return null;
end;
$$;
revoke all on function public.buddy_invite_operation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.buddy_invite_operation(uuid, text, text) to service_role;
