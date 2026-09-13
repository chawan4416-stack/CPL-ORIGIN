-- CPL Ver1.0 / validate course layout against master
-- Master is the single source of truth for JRA turf course-layout selection.

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
  v_race_class text;
  v_has_race_class_master boolean;
  v_layout_count integer;
  v_course text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_race is null or jsonb_typeof(p_race) <> 'object' then raise exception 'INVALID_RACE_DATA'; end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) <> 3
     or (select count(*) from jsonb_array_elements(p_results) x where (x->>'finish_position')::integer = 1) <> 1
     or (select count(*) from jsonb_array_elements(p_results) x where (x->>'finish_position')::integer = 2) <> 1
     or (select count(*) from jsonb_array_elements(p_results) x where (x->>'finish_position')::integer = 3) <> 1
  then raise exception 'THREE_RESULTS_REQUIRED'; end if;

  if (p_race->>'race_number')::integer not between 1 and 12 then raise exception 'INVALID_RACE_NUMBER'; end if;
  if (p_race->>'field_size')::integer not between 1 and 18 then raise exception 'INVALID_FIELD_SIZE'; end if;

  if not exists (select 1 from public.master_options where category='RACE' and field_key='RACECOURSE' and option_value=p_race->>'racecourse' and active) then raise exception 'INVALID_RACECOURSE_MASTER'; end if;
  if not exists (select 1 from public.master_options where category='RACE' and field_key='SURFACE' and option_value=p_race->>'surface' and active) then raise exception 'INVALID_SURFACE_MASTER'; end if;
  if not exists (select 1 from public.master_options where category='RACE' and field_key='TRACK_CONDITION' and option_value=p_race->>'track_condition' and active) then raise exception 'INVALID_TRACK_CONDITION_MASTER'; end if;
  if not exists (select 1 from public.master_options where category='COURSE' and field_key=p_race->>'racecourse' and option_value=p_race->>'course' and active) then raise exception 'INVALID_COURSE_MASTER'; end if;
  if not exists (select 1 from public.master_options where category='DISTANCE' and field_key=p_race->>'racecourse' and option_value=p_race->>'distance' and active) then raise exception 'INVALID_DISTANCE_MASTER'; end if;

  -- For JRA turf, course layout is master-backed. Local courses remain unchanged.
  if p_race->>'surface' = '芝' and exists (
    select 1 from public.master_options where category='COURSE_DISTANCE'
      and field_key = concat(p_race->>'racecourse', ':芝:', p_race->>'distance') and active
  ) then
    select count(*) into v_layout_count
    from public.master_options
    where category='COURSE_DISTANCE'
      and field_key = concat(p_race->>'racecourse', ':芝:', p_race->>'distance')
      and active;
    v_course := nullif(p_race->>'course','');
    if v_layout_count = 1 then
      if not exists (
        select 1 from public.master_options
        where category='COURSE_DISTANCE'
          and field_key = concat(p_race->>'racecourse', ':芝:', p_race->>'distance')
          and option_value = v_course and active
      ) then raise exception 'INVALID_COURSE_DISTANCE_MASTER'; end if;
    elsif v_layout_count > 1 and v_course is null then
      raise exception 'COURSE_SELECTION_REQUIRED';
    elsif v_layout_count > 1 and not exists (
      select 1 from public.master_options
      where category='COURSE_DISTANCE'
        and field_key = concat(p_race->>'racecourse', ':芝:', p_race->>'distance')
        and option_value = v_course and active
    ) then raise exception 'INVALID_COURSE_DISTANCE_MASTER'; end if;
  end if;

  v_race_class := nullif(p_race->>'race_class','');
  select exists (select 1 from public.master_options where category='RACE_CLASS' and field_key=p_race->>'racecourse' and active) into v_has_race_class_master;
  if v_has_race_class_master then
    if v_race_class is null or not exists (select 1 from public.master_options where category='RACE_CLASS' and field_key=p_race->>'racecourse' and option_value=v_race_class and active) then raise exception 'INVALID_RACE_CLASS_MASTER'; end if;
  elsif v_race_class is not null then raise exception 'INVALID_RACE_CLASS_MASTER'; end if;

  for v_item in select value from jsonb_array_elements(p_results) loop
    v_position := (v_item->>'finish_position')::integer;
    v_popularity := (v_item->>'popularity')::integer;
    if v_popularity is null or v_popularity < 1 or v_popularity > (p_race->>'field_size')::integer then raise exception 'INVALID_POPULARITY'; end if;
    if (v_item->>'win_odds')::numeric <= 0 or (v_item->>'win_odds')::numeric > 999.90 then raise exception 'INVALID_WIN_ODDS'; end if;
    foreach v_body_field in array array['CHEST','HINDQUARTER','GAIT','BALANCE','TONE','ABDOMEN','PADDOCK_EVALUATION'] loop
      v_body_value := v_item->>lower(v_body_field);
      if not exists (select 1 from public.master_options where category='BODY' and field_key=v_body_field and option_value=v_body_value and active) then raise exception 'INVALID_BODY_MASTER:%', v_body_field; end if;
    end loop;
  end loop;

  if exists (select v_item->>'popularity' from jsonb_array_elements(p_results) v_item group by v_item->>'popularity' having count(*) > 1) then raise exception 'DUPLICATE_POPULARITY'; end if;

  if p_race_id is null then
    if exists (select 1 from public.races where created_by=auth.uid() and race_date=(p_race->>'race_date')::date and racecourse=p_race->>'racecourse' and race_number=(p_race->>'race_number')::smallint) then raise exception 'DUPLICATE_RACE'; end if;
    insert into public.races (race_date,racecourse,race_number,course,surface,distance,race_class,track_condition,field_size,created_by)
    values ((p_race->>'race_date')::date,p_race->>'racecourse',(p_race->>'race_number')::smallint,p_race->>'course',p_race->>'surface',(p_race->>'distance')::integer,v_race_class,p_race->>'track_condition',(p_race->>'field_size')::smallint,auth.uid()) returning id into v_race_id;
  else
    select id into v_race_id from public.races where id=p_race_id and created_by=auth.uid();
    if v_race_id is null then raise exception 'RACE_NOT_FOUND'; end if;
    if exists (select 1 from public.races where created_by=auth.uid() and race_date=(p_race->>'race_date')::date and racecourse=p_race->>'racecourse' and race_number=(p_race->>'race_number')::smallint and id<>v_race_id) then raise exception 'DUPLICATE_RACE'; end if;
    update public.races set race_date=(p_race->>'race_date')::date,racecourse=p_race->>'racecourse',race_number=(p_race->>'race_number')::smallint,course=p_race->>'course',surface=p_race->>'surface',distance=(p_race->>'distance')::integer,race_class=v_race_class,track_condition=p_race->>'track_condition',field_size=(p_race->>'field_size')::smallint where id=v_race_id;
    delete from public.race_results where race_id=v_race_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_results) loop
    insert into public.race_results (race_id,finish_position,popularity,win_odds,chest,hindquarter,gait,balance,tone,abdomen,paddock_evaluation)
    values (v_race_id,(v_item->>'finish_position')::smallint,(v_item->>'popularity')::smallint,(v_item->>'win_odds')::numeric,v_item->>'chest',v_item->>'hindquarter',v_item->>'gait',v_item->>'balance',v_item->>'tone',v_item->>'abdomen',v_item->>'paddock_evaluation');
  end loop;
  return v_race_id;
end;
$$;

grant execute on function public.save_race(jsonb,jsonb,uuid) to authenticated;
