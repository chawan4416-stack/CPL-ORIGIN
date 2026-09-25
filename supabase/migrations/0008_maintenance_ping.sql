-- CPL Ver1.0: lightweight database activity endpoint for scheduled maintenance.
-- This function performs a database query without exposing application data.

create or replace function public.maintenance_ping()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select 1;
$$;

revoke all on function public.maintenance_ping() from public;
grant execute on function public.maintenance_ping() to anon, authenticated;
