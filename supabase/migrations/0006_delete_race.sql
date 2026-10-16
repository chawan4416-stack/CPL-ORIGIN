-- CPL Ver1.0: owner-only race deletion.
-- Deleting a race cascades to its race_results. No deletion history is stored.

create or replace function public.delete_race(
  p_race_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from public.races
  where id = p_race_id
    and created_by = auth.uid();

  if not found then
    raise exception 'RACE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.delete_race(uuid) from public;
grant execute on function public.delete_race(uuid) to authenticated;
