-- CPL Ver1.0: JRA10 surface × distance × course master normalization.
-- Existing DISTANCE/COURSE masters remain for master-driven local fallback.

delete from public.master_options
where category = 'COURSE_DISTANCE'
  and field_key ~ '^(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉):(芝|ダート):[0-9]+$';

with normal_courses(racecourse, surface, distances) as (
  values
    ('札幌','芝',array[1000,1200,1500,1800,2000,2600]),('札幌','ダート',array[1000,1700,2400]),
    ('函館','芝',array[1000,1200,1700,1800,2000,2600]),('函館','ダート',array[1000,1700,2400]),
    ('福島','芝',array[1000,1200,1700,1800,2000,2600]),('福島','ダート',array[1000,1150,1700,2400]),
    ('新潟','ダート',array[1000,1200,1700,1800,2500]),
    ('東京','芝',array[1400,1600,1800,2000,2300,2400,2500,2600,3400]),('東京','ダート',array[1200,1300,1400,1600,2100,2400]),
    ('中山','ダート',array[1000,1200,1700,1800,2400,2500]),
    ('中京','芝',array[1200,1300,1400,1600,2000,2200,3000]),('中京','ダート',array[1200,1400,1800,1900,2500]),
    ('京都','ダート',array[1000,1100,1200,1400,1800,1900,2600]),
    ('阪神','ダート',array[1200,1400,1800,2000,2600]),
    ('小倉','芝',array[1000,1200,1700,1800,2000,2600]),('小倉','ダート',array[1000,1700,2400])
), source_rows as (
  select racecourse, surface, distance, '通常'::text as option_value from normal_courses cross join lateral unnest(distances) distance
  union all values
    ('新潟','芝',1000,'直線'),('新潟','芝',1200,'内回り'),('新潟','芝',1400,'内回り'),('新潟','芝',1400,'外回り'),('新潟','芝',1600,'外回り'),('新潟','芝',1800,'外回り'),('新潟','芝',2000,'内回り'),('新潟','芝',2000,'外回り'),('新潟','芝',2200,'内回り'),('新潟','芝',2400,'内回り'),('新潟','芝',3000,'外回り'),('新潟','芝',3200,'外回り'),
    ('中山','芝',1200,'外回り'),('中山','芝',1600,'外回り'),('中山','芝',1800,'内回り'),('中山','芝',2000,'内回り'),('中山','芝',2200,'外回り'),('中山','芝',2500,'内回り'),('中山','芝',2600,'外回り'),('中山','芝',3200,'内回り'),('中山','芝',3200,'外回り'),('中山','芝',3600,'内回り'),('中山','芝',4000,'外回り'),
    ('京都','芝',1100,'内回り'),('京都','芝',1200,'内回り'),('京都','芝',1400,'内回り'),('京都','芝',1400,'外回り'),('京都','芝',1600,'内回り'),('京都','芝',1600,'外回り'),('京都','芝',1800,'外回り'),('京都','芝',2000,'内回り'),('京都','芝',2000,'外回り'),('京都','芝',2200,'外回り'),('京都','芝',2400,'外回り'),('京都','芝',3000,'外回り'),('京都','芝',3200,'外回り'),
    ('阪神','芝',1200,'内回り'),('阪神','芝',1400,'内回り'),('阪神','芝',1400,'外回り'),('阪神','芝',1600,'外回り'),('阪神','芝',1800,'外回り'),('阪神','芝',2000,'内回り'),('阪神','芝',2200,'内回り'),('阪神','芝',2400,'外回り'),('阪神','芝',2600,'外回り'),('阪神','芝',3000,'内回り'),('阪神','芝',3200,'内回り'),('阪神','芝',3200,'外回り')
)
insert into public.master_options(category,field_key,option_value,sort_order)
select 'COURSE_DISTANCE', concat(racecourse,':',surface,':',distance), option_value,
       row_number() over(partition by racecourse,surface order by distance, option_value) * 10
from source_rows;

-- JRA is identified by having COURSE_DISTANCE rows. Those rows are the sole
-- authority for surface/distance/course; other racecourses retain legacy checks.
create or replace function public.save_race(p_race jsonb,p_results jsonb,p_race_id uuid default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_race_id uuid; v_item jsonb; v_popularity integer; v_body_field text; v_course text; v_race_class text; v_layout_count integer; v_has_cd boolean; v_has_race_class boolean;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_race is null or jsonb_typeof(p_race)<>'object' then raise exception 'INVALID_RACE_DATA'; end if;
 if p_results is null or jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>3 or (select count(*) from jsonb_array_elements(p_results)x where (x->>'finish_position')::integer=1)<>1 or (select count(*) from jsonb_array_elements(p_results)x where (x->>'finish_position')::integer=2)<>1 or (select count(*) from jsonb_array_elements(p_results)x where (x->>'finish_position')::integer=3)<>1 then raise exception 'THREE_RESULTS_REQUIRED'; end if;
 if (p_race->>'race_number')::integer not between 1 and 12 then raise exception 'INVALID_RACE_NUMBER'; end if; if (p_race->>'field_size')::integer not between 1 and 18 then raise exception 'INVALID_FIELD_SIZE'; end if;
 if not exists(select 1 from public.master_options where category='RACE' and field_key='RACECOURSE' and option_value=p_race->>'racecourse' and active) then raise exception 'INVALID_RACECOURSE_MASTER'; end if;
 if not exists(select 1 from public.master_options where category='RACE' and field_key='SURFACE' and option_value=p_race->>'surface' and active) then raise exception 'INVALID_SURFACE_MASTER'; end if;
 if not exists(select 1 from public.master_options where category='RACE' and field_key='TRACK_CONDITION' and option_value=p_race->>'track_condition' and active) then raise exception 'INVALID_TRACK_CONDITION_MASTER'; end if;
 select exists(select 1 from public.master_options where category='COURSE_DISTANCE' and field_key like concat(p_race->>'racecourse',':%') and active) into v_has_cd;
 v_course:=nullif(p_race->>'course','');
 if v_has_cd then
   select count(*) into v_layout_count from public.master_options where category='COURSE_DISTANCE' and field_key=concat(p_race->>'racecourse',':',p_race->>'surface',':',p_race->>'distance') and active;
   if v_layout_count=0 then raise exception 'INVALID_COURSE_DISTANCE_COMBINATION'; end if;
   if v_layout_count>1 and v_course is null then raise exception 'COURSE_SELECTION_REQUIRED'; end if;
   if not exists(select 1 from public.master_options where category='COURSE_DISTANCE' and field_key=concat(p_race->>'racecourse',':',p_race->>'surface',':',p_race->>'distance') and option_value=v_course and active) then raise exception 'INVALID_COURSE_DISTANCE_MASTER'; end if;
 else
   if not exists(select 1 from public.master_options where category='COURSE' and field_key=p_race->>'racecourse' and option_value=v_course and active) then raise exception 'INVALID_COURSE_MASTER'; end if;
   if not exists(select 1 from public.master_options where category='DISTANCE' and field_key=p_race->>'racecourse' and option_value=p_race->>'distance' and active) then raise exception 'INVALID_DISTANCE_MASTER'; end if;
 end if;
 select exists(select 1 from public.master_options where category='RACE_CLASS' and field_key=p_race->>'racecourse' and active) into v_has_race_class; v_race_class:=nullif(p_race->>'race_class',''); if v_has_race_class and (v_race_class is null or not exists(select 1 from public.master_options where category='RACE_CLASS' and field_key=p_race->>'racecourse' and option_value=v_race_class and active)) then raise exception 'INVALID_RACE_CLASS_MASTER'; end if; if not v_has_race_class and v_race_class is not null then raise exception 'INVALID_RACE_CLASS_MASTER'; end if;
 for v_item in select value from jsonb_array_elements(p_results) loop v_popularity:=(v_item->>'popularity')::integer; if v_popularity is null or v_popularity<1 or v_popularity>(p_race->>'field_size')::integer then raise exception 'INVALID_POPULARITY'; end if; if (v_item->>'win_odds')::numeric<=0 or (v_item->>'win_odds')::numeric>999.90 then raise exception 'INVALID_WIN_ODDS'; end if; foreach v_body_field in array array['CHEST','HINDQUARTER','GAIT','BALANCE','TONE','ABDOMEN','PADDOCK_EVALUATION'] loop if not exists(select 1 from public.master_options where category='BODY' and field_key=v_body_field and option_value=v_item->>lower(v_body_field) and active) then raise exception 'INVALID_BODY_MASTER:%',v_body_field; end if; end loop; end loop;
 if exists(select v_item->>'popularity' from jsonb_array_elements(p_results)v_item group by v_item->>'popularity' having count(*)>1) then raise exception 'DUPLICATE_POPULARITY'; end if;
 if p_race_id is null then if exists(select 1 from public.races where created_by=auth.uid() and race_date=(p_race->>'race_date')::date and racecourse=p_race->>'racecourse' and race_number=(p_race->>'race_number')::smallint) then raise exception 'DUPLICATE_RACE'; end if; insert into public.races(race_date,racecourse,race_number,course,surface,distance,race_class,track_condition,field_size,created_by) values((p_race->>'race_date')::date,p_race->>'racecourse',(p_race->>'race_number')::smallint,v_course,p_race->>'surface',(p_race->>'distance')::integer,v_race_class,p_race->>'track_condition',(p_race->>'field_size')::smallint,auth.uid()) returning id into v_race_id; else select id into v_race_id from public.races where id=p_race_id and created_by=auth.uid(); if v_race_id is null then raise exception 'RACE_NOT_FOUND'; end if; if exists(select 1 from public.races where created_by=auth.uid() and race_date=(p_race->>'race_date')::date and racecourse=p_race->>'racecourse' and race_number=(p_race->>'race_number')::smallint and id<>v_race_id) then raise exception 'DUPLICATE_RACE'; end if; update public.races set race_date=(p_race->>'race_date')::date,racecourse=p_race->>'racecourse',race_number=(p_race->>'race_number')::smallint,course=v_course,surface=p_race->>'surface',distance=(p_race->>'distance')::integer,race_class=v_race_class,track_condition=p_race->>'track_condition',field_size=(p_race->>'field_size')::smallint where id=v_race_id; delete from public.race_results where race_id=v_race_id; end if;
 for v_item in select value from jsonb_array_elements(p_results) loop insert into public.race_results(race_id,finish_position,popularity,win_odds,chest,hindquarter,gait,balance,tone,abdomen,paddock_evaluation) values(v_race_id,(v_item->>'finish_position')::smallint,(v_item->>'popularity')::smallint,(v_item->>'win_odds')::numeric,v_item->>'chest',v_item->>'hindquarter',v_item->>'gait',v_item->>'balance',v_item->>'tone',v_item->>'abdomen',v_item->>'paddock_evaluation'); end loop; return v_race_id;
end; $$;
grant execute on function public.save_race(jsonb,jsonb,uuid) to authenticated;
