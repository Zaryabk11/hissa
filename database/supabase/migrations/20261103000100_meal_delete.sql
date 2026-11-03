-- Backend-only meal edit and delete (decision 0006). Each is one function call, so one transaction:
-- supabase-js has no transaction, and ordered client-side deletes could leave a meal without items,
-- or a streak day with no meal behind it, if the second call failed.
--
-- Both take the owner id explicitly (the backend uses the service role) and touch only that
-- user's rows. They are SECURITY INVOKER: the service role already has the table access they need.

-- Deletes one meal of the actor. meal_items and feel_checkins go with it (on delete cascade),
-- user_experiments.tried_meal_id is cleared (on delete set null). If it was the actor's last
-- meal of that PKT day, that day's streak_days row goes too. "Counts" means a meal with a
-- confirmed item, the same rule buddy_status_operation uses to repair streak days, so a header
-- without items cannot keep a day alive. Returns false when the meal is not the actor's.
create or replace function public.meal_delete(actor_id uuid, target_meal_id uuid)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  gone_at timestamptz;
  gone_day date;
begin
  delete from public.meals where id = target_meal_id and user_id = actor_id
    returning eaten_at into gone_at;
  if not found then
    return false;
  end if;
  gone_day := (gone_at at time zone 'Asia/Karachi')::date;
  delete from public.streak_days
    where user_id = actor_id and day = gone_day
      and not exists (
        select 1 from public.meals m
        where m.user_id = actor_id
          and (m.eaten_at at time zone 'Asia/Karachi')::date = gone_day
          and exists (select 1 from public.meal_items i
                      where i.meal_id = m.id and i.confirmed_dish_id is not null));
  return true;
end;
$$;

-- Replaces all items of one meal of the actor and sets its recomputed estimated total. eaten_at is
-- untouched, so the PKT day and streak row stay valid. new_items is a JSON array of
-- {predicted_dish_id, confirmed_dish_id, predicted_portion, confirmed_portion, confidence}.
-- Returns false when the meal is not the actor's.
create or replace function public.meal_replace_items(
  actor_id uuid, target_meal_id uuid, new_total numeric, new_items jsonb)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform 1 from public.meals where id = target_meal_id and user_id = actor_id for update;
  if not found then
    return false;
  end if;
  delete from public.meal_items where meal_id = target_meal_id;
  insert into public.meal_items
    (meal_id, predicted_dish_id, confirmed_dish_id, predicted_portion, confirmed_portion, confidence)
  select target_meal_id,
         (e->>'predicted_dish_id')::uuid, (e->>'confirmed_dish_id')::uuid,
         (e->>'predicted_portion')::numeric, (e->>'confirmed_portion')::numeric,
         (e->>'confidence')::numeric
    from jsonb_array_elements(new_items) as e;
  update public.meals set total_calories = new_total where id = target_meal_id;
  return true;
end;
$$;

revoke execute on function public.meal_delete(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.meal_replace_items(uuid, uuid, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.meal_delete(uuid, uuid) to service_role;
grant execute on function public.meal_replace_items(uuid, uuid, numeric, jsonb) to service_role;
