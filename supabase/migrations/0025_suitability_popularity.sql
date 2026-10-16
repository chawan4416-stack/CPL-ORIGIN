-- CPL-DEV: record official popularity for new suitability observations.
-- Legacy horse numbers remain identifiable; they are never inferred to be popularity.
alter table public.suitability_observations
  add column id uuid not null default gen_random_uuid(),
  add column popularity smallint check (popularity between 1 and 18);
alter table public.suitability_observations drop constraint suitability_observations_pkey;
alter table public.suitability_observations alter column horse_number drop not null;
alter table public.suitability_observations add constraint suitability_observations_pkey primary key (id);
alter table public.suitability_observations add constraint suitability_identifier_check
  check ((popularity is not null) <> (horse_number is not null));
create unique index suitability_legacy_horse_uidx on public.suitability_observations(race_id,horse_number)
  where horse_number is not null;
create unique index suitability_popularity_uidx on public.suitability_observations(race_id,popularity)
  where popularity is not null;

create or replace function public.save_suitability_research(p_race jsonb,p_horses jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_size integer;
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_horses is null or jsonb_typeof(p_horses)<>'array' or jsonb_array_length(p_horses)<1
   or jsonb_array_length(p_horses)>18 then raise exception 'HORSES_REQUIRED'; end if;
 v_size:=(p_race->>'field_size')::integer;
 for v_item in select value from jsonb_array_elements(p_horses) x(value) loop
   if jsonb_typeof(v_item)<>'object' or nullif(v_item->>'popularity','') is null or (v_item->>'popularity')::integer not between 1 and v_size
      or (v_item->>'finish_position')::integer not between 1 and 3
      or not exists(select 1 from public.master_options where category='SUITABILITY' and field_key='CHEST' and option_value=v_item->>'chest' and active)
      or not exists(select 1 from public.master_options where category='SUITABILITY' and field_key='HINDQUARTER' and option_value=v_item->>'hindquarter' and active)
      or (nullif(v_item->>'tone','') is not null and not exists(select 1 from public.master_options where category='SUITABILITY' and field_key='TONE' and option_value=v_item->>'tone' and active))
   then raise exception 'INVALID_SUITABILITY'; end if;
 end loop;
 if (select count(distinct (x.value->>'popularity')::integer) from jsonb_array_elements(p_horses) x(value))<>jsonb_array_length(p_horses)
 then raise exception 'DUPLICATE_POPULARITY'; end if;
 if not exists(select 1 from jsonb_array_elements(p_horses) x(value) where (x.value->>'finish_position')::integer=1)
 then raise exception 'OFFICIAL_FIRST_REQUIRED'; end if;
 v_id:=cpl_private.ensure_research_race(p_race);
 -- Replace this race's suitability observations only, under the owner's verified race.
 delete from public.suitability_observations where race_id=v_id;
 for v_item in select value from jsonb_array_elements(p_horses) x(value) loop
   insert into public.suitability_observations(race_id,popularity,finish_position,chest,hindquarter,tone)
   values(v_id,(v_item->>'popularity')::smallint,(v_item->>'finish_position')::smallint,
     v_item->>'chest',v_item->>'hindquarter',nullif(v_item->>'tone',''));
 end loop;
 return v_id;
end $$;
revoke all on function public.save_suitability_research(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_suitability_research(jsonb,jsonb) to authenticated;
