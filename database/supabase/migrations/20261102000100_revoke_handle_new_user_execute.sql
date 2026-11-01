-- handle_new_user is a trigger function: nobody should call it through the API.
-- The trigger on auth.users still fires (trigger execution does not check EXECUTE).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
