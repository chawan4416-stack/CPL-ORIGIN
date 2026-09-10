-- CPL Ver1.0: one race per user/date/course/race number.
-- Existing races may be overwritten; change history is intentionally not stored.

create unique index if not exists races_owner_date_course_number_uidx
on public.races (created_by, race_date, racecourse, race_number);

create or replace function public.save_race(
  p_race jsonb,
  p_results jsonb,
  p_race_id uuid default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_race_id uuid;
  v_item jsonb;
  v_position integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) <> 3 then
    raise exception 'THREE_RESULTS_REQUIRED';
  end if;

  if p_race_id is null then
    if exists (
      select 1
      from public.races
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
    select id into v_race_id
    from public.races
    where id = p_race_id
      and created_by = auth.uid();

    if v_race_id is null then
      raise exception 'RACE_NOT_FOUND';
    end if;

    if exists (
      select 1
      from public.races
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

  for v_item in select value from jsonb_array_elements(p_results)
  loop
    v_position := (v_item->>'finish_position')::integer;
    if v_position not in (1,2,3) then
      raise exception 'INVALID_FINISH_POSITION';
    end if;

    insert into public.race_results (
      race_id, finish_position, popularity, win_odds,
      chest, hindquarter, gait, balance, tone, abdomen, paddock_evaluation
    ) values (
      v_race_id,
      v_position,
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

grant execute on function public.save_race(jsonb, jsonb, uuid) to authenticated;
