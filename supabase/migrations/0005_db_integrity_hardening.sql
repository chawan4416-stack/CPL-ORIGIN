-- CPL Ver1.0: database-side integrity hardening.
-- The UI is not the trust boundary. Persistent race data must be valid even if the client is bypassed.
-- MASTER_DATA authority is represented by public.master_options.
-- Direct authenticated writes to races/results are disabled; save_race() is the single write path.

-- 1) Align basic numeric constraints with the Ver1.0 input contract.
alter table public.races
  drop constraint if exists races_race_number_check;

alter table public.races
  add constraint races_race_number_v1_check
  check (race_number between 1 and 12);

alter table public.races
  drop constraint if exists races_field_size_check;

alter table public.races
  add constraint races_field_size_v1_check
  check (field_size between 1 and 18);

alter table public.race_results
  drop constraint if exists race_results_win_odds_check;

alter table public.race_results
  add constraint race_results_win_odds_v1_check
  check (win_odds > 0 and win_odds <= 999.90);

-- 2) Replace the legacy two-argument function so there is one authoritative save path.
drop function if exists public.save_race(jsonb, jsonb);

create or replace function public.save_race(
  p_race jsonb,
  p_results jsonb,
  p_race_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_race_id uuid;
  v_item jsonb;
  v_position integer;
  v_popularity integer;
  v_body_field text;
  v_body_value text;
begin
  -- Authentication is mandatory.
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Race object must be present.
  if p_race is null or jsonb_typeof(p_race) <> 'object' then
    raise exception 'INVALID_RACE_DATA';
  end if;

  -- Exactly one 1st, one 2nd, and one 3rd place result is required.
  if p_results is null
     or jsonb_typeof(p_results) <> 'array'
     or jsonb_array_length(p_results) <> 3
     or (select count(*) from jsonb_array_elements(p_results) x where (x->>'finish_position')::integer = 1) <> 1
     or (select count(*) from jsonb_array_elements(p_results) x where (x->>'finish_position')::integer = 2) <> 1
     or (select count(*) from jsonb_array_elements(p_results) x where (x->>'finish_position')::integer = 3) <> 1
  then
    raise exception 'THREE_RESULTS_REQUIRED';
  end if;

  -- Basic race-field validation.
  if (p_race->>'race_number')::integer not between 1 and 12 then
    raise exception 'INVALID_RACE_NUMBER';
  end if;

  if (p_race->>'field_size')::integer not between 1 and 18 then
    raise exception 'INVALID_FIELD_SIZE';
  end if;

  -- Racecourse/surface/track condition must exist in the active master dictionary.
  if not exists (
    select 1 from public.master_options
    where category = 'RACE' and field_key = 'RACECOURSE'
      and option_value = p_race->>'racecourse' and active = true
  ) then
    raise exception 'INVALID_RACECOURSE_MASTER';
  end if;

  if not exists (
    select 1 from public.master_options
    where category = 'RACE' and field_key = 'SURFACE'
      and option_value = p_race->>'surface' and active = true
  ) then
    raise exception 'INVALID_SURFACE_MASTER';
  end if;

  if not exists (
    select 1 from public.master_options
    where category = 'RACE' and field_key = 'TRACK_CONDITION'
      and option_value = p_race->>'track_condition' and active = true
  ) then
    raise exception 'INVALID_TRACK_CONDITION_MASTER';
  end if;

  -- Course and distance must belong to the selected racecourse.
  if not exists (
    select 1 from public.master_options
    where category = 'COURSE'
      and field_key = p_race->>'racecourse'
      and option_value = p_race->>'course'
      and active = true
  ) then
    raise exception 'INVALID_COURSE_MASTER';
  end if;

  if not exists (
    select 1 from public.master_options
    where category = 'DISTANCE'
      and field_key = p_race->>'racecourse'
      and option_value = (p_race->>'distance')
      and active = true
  ) then
    raise exception 'INVALID_DISTANCE_MASTER';
  end if;

  -- Every result must contain valid popularity/odds and master-backed body values.
  for v_item in select value from jsonb_array_elements(p_results)
  loop
    v_position := (v_item->>'finish_position')::integer;
    v_popularity := (v_item->>'popularity')::integer;

    if v_popularity is null
       or v_popularity < 1
       or v_popularity > (p_race->>'field_size')::integer
    then
      raise exception 'INVALID_POPULARITY';
    end if;

    if (v_item->>'win_odds')::numeric <= 0
       or (v_item->>'win_odds')::numeric > 999.90
    then
      raise exception 'INVALID_WIN_ODDS';
    end if;

    foreach v_body_field in array array['CHEST','HINDQUARTER','GAIT','BALANCE','TONE','ABDOMEN','PADDOCK_EVALUATION']
    loop
      v_body_value := v_item->>lower(v_body_field);

      if not exists (
        select 1 from public.master_options
        where category = 'BODY'
          and field_key = v_body_field
          and option_value = v_body_value
          and active = true
      ) then
        raise exception 'INVALID_BODY_MASTER:%', v_body_field;
      end if;
    end loop;
  end loop;

  -- Popularity rank must be unique among the top three.
  if exists (
    select v_item->>'popularity'
    from jsonb_array_elements(p_results) v_item
    group by v_item->>'popularity'
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_POPULARITY';
  end if;

  if p_race_id is null then
    -- One race per user/date/racecourse/race number.
    if exists (
      select 1 from public.races
      where created_by = auth.uid()
        and race_date = (p_race->>'race_date')::date
        and racecourse = p_race->>'racecourse'
        and race_number = (p_race->>'race_number')::smallint
    ) then
      raise exception 'DUPLICATE_RACE';
    end if;

    insert into public.races (
      race_date, racecourse, race_number, course, surface,
      distance, track_condition, field_size, created_by
    ) values (
      (p_race->>'race_date')::date,
      p_race->>'racecourse',
      (p_race->>'race_number')::smallint,
      p_race->>'course',
      p_race->>'surface',
      (p_race->>'distance')::integer,
      p_race->>'track_condition',
      (p_race->>'field_size')::smallint,
      auth.uid()
    ) returning id into v_race_id;
  else
    -- Overwrite is allowed, but only for the authenticated user's own race.
    select id into v_race_id
    from public.races
    where id = p_race_id
      and created_by = auth.uid();

    if v_race_id is null then
      raise exception 'RACE_NOT_FOUND';
    end if;

    if exists (
      select 1 from public.races
      where created_by = auth.uid()
        and race_date = (p_race->>'race_date')::date
        and racecourse = p_race->>'racecourse'
        and race_number = (p_race->>'race_number')::smallint
        and id <> v_race_id
    ) then
      raise exception 'DUPLICATE_RACE';
    end if;

    update public.races
    set
      race_date = (p_race->>'race_date')::date,
      racecourse = p_race->>'racecourse',
      race_number = (p_race->>'race_number')::smallint,
      course = p_race->>'course',
      surface = p_race->>'surface',
      distance = (p_race->>'distance')::integer,
      track_condition = p_race->>'track_condition',
      field_size = (p_race->>'field_size')::smallint
    where id = v_race_id;

    delete from public.race_results
    where race_id = v_race_id;
  end if;

  -- Write exactly the three validated result rows.
  for v_item in select value from jsonb_array_elements(p_results)
  loop
    insert into public.race_results (
      race_id, finish_position, popularity, win_odds,
      chest, hindquarter, gait, balance, tone, abdomen, paddock_evaluation
    ) values (
      v_race_id,
      (v_item->>'finish_position')::smallint,
      (v_item->>'popularity')::smallint,
      (v_item->>'win_odds')::numeric,
      v_item->>'chest',
      v_item->>'hindquarter',
      v_item->>'gait',
      v_item->>'balance',
      v_item->>'tone',
      v_item->>'abdomen',
      v_item->>'paddock_evaluation'
    );
  end loop;

  return v_race_id;
end;
$$;

-- The RPC is the only authenticated write path for race data.
revoke insert, update, delete on table public.races from authenticated;
revoke insert, update, delete on table public.race_results from authenticated;

grant execute on function public.save_race(jsonb, jsonb, uuid) to authenticated;
