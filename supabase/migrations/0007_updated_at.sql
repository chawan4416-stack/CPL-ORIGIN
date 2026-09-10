-- CPL Ver1.0: track the latest update time without storing change history.

alter table public.races
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_races_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists races_set_updated_at on public.races;

create trigger races_set_updated_at
before update on public.races
for each row
execute function public.set_races_updated_at();
