-- CPL-DEV research split. Additive: keep legacy and 0022 data intact.
insert into public.master_options(category,field_key,option_value,sort_order,active) values
 ('SUITABILITY','CHEST','シャープ',10,true),('SUITABILITY','CHEST','厚−',20,true),
 ('SUITABILITY','CHEST','厚',30,true),('SUITABILITY','CHEST','重厚',40,true),
 ('SUITABILITY','HINDQUARTER','シャープ−',10,true),('SUITABILITY','HINDQUARTER','シャープ',20,true),
 ('SUITABILITY','HINDQUARTER','厚−',30,true),('SUITABILITY','HINDQUARTER','厚',40,true),
 ('SUITABILITY','HINDQUARTER','重厚−',50,true),('SUITABILITY','HINDQUARTER','重厚',60,true),
 ('SUITABILITY','TONE','パンパン',10,true),('SUITABILITY','TONE','普通',20,true),
 ('SUITABILITY','TONE','ゴム感',30,true);

create table public.suitability_observations (
 race_id uuid not null references public.races(id) on delete cascade,
 horse_number smallint not null check (horse_number between 1 and 18),
 finish_position smallint not null check (finish_position between 1 and 3),
 chest text not null check (chest in ('シャープ','厚−','厚','重厚')),
 hindquarter text not null check (hindquarter in ('シャープ−','シャープ','厚−','厚','重厚−','重厚')),
 tone text check (tone in ('パンパン','普通','ゴム感')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (race_id,horse_number)
);
create index suitability_combo_idx on public.suitability_observations(chest,hindquarter);

create table public.condition_observations (
 race_id uuid not null references public.races(id) on delete cascade,
 horse_number smallint not null check (horse_number between 1 and 18),
 chaka boolean not null default false,
 awkward_gait boolean not null default false,
 agitation text check (agitation in ('あり','強')),
 sweating text check (sweating in ('あり','強')),
 fast_walking boolean not null default false,
 outcome_status text not null check (outcome_status in ('placed','finished_other','dnf','scratched')),
 finish_position smallint check (finish_position between 1 and 3),
 popularity smallint check (popularity between 1 and 18),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (race_id,horse_number),
 constraint condition_selected_check check
   (chaka or awkward_gait or agitation is not null or sweating is not null or fast_walking),
 constraint condition_result_check check (
   (outcome_status='placed' and finish_position is not null and popularity is not null) or
   (outcome_status in ('finished_other','dnf') and finish_position is null and popularity is not null) or
   (outcome_status='scratched' and finish_position is null and popularity is null)
 )
);
create index condition_outcome_idx on public.condition_observations(outcome_status,finish_position);

alter table public.suitability_observations enable row level security;
alter table public.condition_observations enable row level security;
create policy suitability_own_read on public.suitability_observations for select to authenticated
 using (exists (select 1 from public.races r where r.id=race_id and r.created_by=(select auth.uid())));
create policy condition_own_read on public.condition_observations for select to authenticated
 using (exists (select 1 from public.races r where r.id=race_id and r.created_by=(select auth.uid())));
revoke all on public.suitability_observations,public.condition_observations from public,anon,authenticated;
grant select on public.suitability_observations,public.condition_observations to authenticated;

-- Called from SECURITY DEFINER RPCs; never exposed to API roles.
create function cpl_private.ensure_research_race(p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_course text; v_size integer; v_class text; v_layouts integer;
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 if p is null or jsonb_typeof(p)<>'object' or (p->>'race_date')::date is null
    or (p->>'race_number')::integer not between 1 and 12
    or (p->>'field_size')::integer not between 1 and 18
    or (p->>'distance')::integer <= 0 then raise exception 'INVALID_RACE'; end if;
 if not exists(select 1 from public.master_options where category='RACE' and field_key='RACECOURSE' and option_value=p->>'racecourse' and active)
    or not exists(select 1 from public.master_options where category='RACE' and field_key='SURFACE' and option_value=p->>'surface' and active)
    or not exists(select 1 from public.master_options where category='RACE' and field_key='TRACK_CONDITION' and option_value=p->>'track_condition' and active)
 then raise exception 'INVALID_RACE_MASTER'; end if;
 v_course:=nullif(p->>'course','');
 select count(*) into v_layouts from public.master_options where category='COURSE_DISTANCE'
   and field_key=concat(p->>'racecourse',':',p->>'surface',':',p->>'distance') and active;
 if v_layouts>0 then
   if not exists(select 1 from public.master_options where category='COURSE_DISTANCE'
      and field_key=concat(p->>'racecourse',':',p->>'surface',':',p->>'distance') and option_value=v_course and active)
   then raise exception 'INVALID_COURSE_DISTANCE'; end if;
 elsif not exists(select 1 from public.master_options where category='COURSE' and field_key=p->>'racecourse' and option_value=v_course and active)
    or not exists(select 1 from public.master_options where category='DISTANCE' and field_key=p->>'racecourse' and option_value=p->>'distance' and active)
 then raise exception 'INVALID_COURSE_DISTANCE'; end if;
 v_class:=nullif(p->>'race_class','');
 if v_class is not null and not exists(select 1 from public.master_options where category='RACE_CLASS'
     and field_key=p->>'racecourse' and option_value=v_class and active)
 then raise exception 'INVALID_RACE_CLASS'; end if;
 insert into public.races(race_date,racecourse,race_number,course,surface,distance,race_class,track_condition,field_size,created_by)
 values ((p->>'race_date')::date,p->>'racecourse',(p->>'race_number')::smallint,v_course,p->>'surface',
   (p->>'distance')::integer,v_class,p->>'track_condition',(p->>'field_size')::smallint,(select auth.uid()))
 on conflict (created_by,race_date,racecourse,race_number) do nothing returning id into v_id;
 if v_id is null then
   select id into v_id from public.races where created_by=(select auth.uid())
     and race_date=(p->>'race_date')::date and racecourse=p->>'racecourse'
     and race_number=(p->>'race_number')::smallint;
   if v_id is null then raise exception 'RACE_NOT_FOUND'; end if;
   if not exists(select 1 from public.races where id=v_id and surface=p->>'surface'
     and distance=(p->>'distance')::integer and course=v_course
     and track_condition=p->>'track_condition' and field_size=(p->>'field_size')::smallint
     and race_class is not distinct from v_class)
   then raise exception 'RACE_HEADER_CONFLICT'; end if;
 end if;
 return v_id;
end $$;
revoke all on function cpl_private.ensure_research_race(jsonb) from public,anon,authenticated;

create function public.save_suitability_research(p_race jsonb,p_horses jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_size integer;
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_horses is null or jsonb_typeof(p_horses)<>'array' or jsonb_array_length(p_horses)<1
   or jsonb_array_length(p_horses)>18 then raise exception 'HORSES_REQUIRED'; end if;
 v_size:=(p_race->>'field_size')::integer;
 for v_item in select value from jsonb_array_elements(p_horses) x(value) loop
   if jsonb_typeof(v_item)<>'object' or (v_item->>'horse_number')::integer not between 1 and v_size
      or (v_item->>'finish_position')::integer not between 1 and 3
      or not exists(select 1 from public.master_options where category='SUITABILITY' and field_key='CHEST' and option_value=v_item->>'chest' and active)
      or not exists(select 1 from public.master_options where category='SUITABILITY' and field_key='HINDQUARTER' and option_value=v_item->>'hindquarter' and active)
      or (nullif(v_item->>'tone','') is not null and not exists(select 1 from public.master_options where category='SUITABILITY' and field_key='TONE' and option_value=v_item->>'tone' and active))
   then raise exception 'INVALID_SUITABILITY'; end if;
 end loop;
 if (select count(distinct (x.value->>'horse_number')::integer) from jsonb_array_elements(p_horses) x(value))<>jsonb_array_length(p_horses)
 then raise exception 'DUPLICATE_HORSE'; end if;
 v_id:=cpl_private.ensure_research_race(p_race);
 -- Replace only this research's observations; no legacy or condition rows are touched.
 delete from public.suitability_observations where race_id=v_id;
 for v_item in select value from jsonb_array_elements(p_horses) x(value) loop
   insert into public.suitability_observations(race_id,horse_number,finish_position,chest,hindquarter,tone)
   values(v_id,(v_item->>'horse_number')::smallint,(v_item->>'finish_position')::smallint,
     v_item->>'chest',v_item->>'hindquarter',nullif(v_item->>'tone',''));
 end loop;
 return v_id;
end $$;

create function public.save_condition_research(p_race jsonb,p_horse jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_size integer; v_status text; v_number integer; v_pop integer;
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_horse is null or jsonb_typeof(p_horse)<>'object' then raise exception 'INVALID_CONDITION'; end if;
 v_size:=(p_race->>'field_size')::integer;
 v_number:=(p_horse->>'horse_number')::integer;
 v_status:=p_horse->>'outcome_status'; v_pop:=nullif(p_horse->>'popularity','')::integer;
 if v_number not between 1 and v_size or v_status not in ('placed','finished_other','dnf','scratched')
   or (coalesce((p_horse->>'chaka')::boolean,false)=false and coalesce((p_horse->>'awkward_gait')::boolean,false)=false
      and nullif(p_horse->>'agitation','') is null and nullif(p_horse->>'sweating','') is null
      and coalesce((p_horse->>'fast_walking')::boolean,false)=false)
   or nullif(p_horse->>'agitation','') is not null and p_horse->>'agitation' not in ('あり','強')
   or nullif(p_horse->>'sweating','') is not null and p_horse->>'sweating' not in ('あり','強')
   or (v_status='scratched' and (v_pop is not null or nullif(p_horse->>'finish_position','') is not null))
   or (v_status<>'scratched' and (v_pop not between 1 and v_size or v_pop is null))
   or (v_status='placed' and (p_horse->>'finish_position')::integer not between 1 and 3)
   or (v_status<>'placed' and nullif(p_horse->>'finish_position','') is not null)
 then raise exception 'INVALID_CONDITION'; end if;
 v_id:=cpl_private.ensure_research_race(p_race);
 insert into public.condition_observations(race_id,horse_number,chaka,awkward_gait,agitation,sweating,fast_walking,outcome_status,finish_position,popularity)
 values(v_id,v_number,coalesce((p_horse->>'chaka')::boolean,false),coalesce((p_horse->>'awkward_gait')::boolean,false),
   nullif(p_horse->>'agitation',''),nullif(p_horse->>'sweating',''),coalesce((p_horse->>'fast_walking')::boolean,false),
   v_status,case when v_status='placed' then (p_horse->>'finish_position')::smallint else null end,v_pop)
 on conflict (race_id,horse_number) do update set chaka=excluded.chaka,awkward_gait=excluded.awkward_gait,
   agitation=excluded.agitation,sweating=excluded.sweating,fast_walking=excluded.fast_walking,
   outcome_status=excluded.outcome_status,finish_position=excluded.finish_position,popularity=excluded.popularity,
   updated_at=now();
 return v_id;
end $$;

create function public.research_suitability_distribution(p_filter jsonb default '{}'::jsonb,p_merge boolean default false)
returns table(chest text,hindquarter text,observations bigint,total bigint,percentage numeric,tone_breakdown jsonb)
language sql security invoker set search_path='' as $$
 with values_chest as (select unnest(case when p_merge then array['シャープ','厚','重厚'] else array['シャープ','厚−','厚','重厚'] end) chest),
 values_hind as (select unnest(array['シャープ−','シャープ','厚−','厚','重厚−','重厚']) hindquarter),
 selected as (select case when p_merge and s.chest='厚−' then '厚' else s.chest end chest,s.hindquarter,s.tone
   from public.suitability_observations s join public.races r on r.id=s.race_id
   where r.created_by=(select auth.uid())
     and (p_filter->>'racecourse' is null or r.racecourse=p_filter->>'racecourse')
     and (p_filter->>'surface' is null or r.surface=p_filter->>'surface')
     and (p_filter->>'course' is null or r.course=p_filter->>'course')
     and (p_filter->>'distance' is null or r.distance=(p_filter->>'distance')::integer)
     and (p_filter->>'track_condition' is null or r.track_condition=p_filter->>'track_condition'))
 select c.chest,h.hindquarter,count(s.chest), (select count(*) from selected),
   case when (select count(*) from selected)=0 then 0 else round(count(s.chest)*100.0/(select count(*) from selected),1) end,
   jsonb_build_object('パンパン',count(*) filter(where s.tone='パンパン'),
     '普通',count(*) filter(where s.tone='普通'),'ゴム感',count(*) filter(where s.tone='ゴム感'),
     '未観察',count(s.chest) filter(where s.tone is null))
 from values_chest c cross join values_hind h left join selected s on s.chest=c.chest and s.hindquarter=h.hindquarter
 group by c.chest,h.hindquarter
 order by array_position(case when p_merge then array['シャープ','厚','重厚'] else array['シャープ','厚−','厚','重厚'] end,c.chest),
   array_position(array['シャープ−','シャープ','厚−','厚','重厚−','重厚'],h.hindquarter)
$$;

create function public.research_condition_summary(p_filter jsonb default '{}'::jsonb)
returns table(condition_key text,recorded bigint,placed bigint,other_finish bigint,dnf bigint,scratched bigint)
language sql security invoker set search_path='' as $$
 with selected as (select c.*,r.distance from public.condition_observations c join public.races r on r.id=c.race_id
   where r.created_by=(select auth.uid())
     and (p_filter->>'racecourse' is null or r.racecourse=p_filter->>'racecourse')
     and (p_filter->>'surface' is null or r.surface=p_filter->>'surface')
     and (p_filter->>'course' is null or r.course=p_filter->>'course')
     and (p_filter->>'distance' is null or r.distance=(p_filter->>'distance')::integer)
     and (p_filter->>'track_condition' is null or r.track_condition=p_filter->>'track_condition')),
 expanded as (select x.key,s.outcome_status from selected s cross join lateral (values
   ('チャカつき',s.chaka),('ぎこちない歩様',s.awkward_gait),
   ('イレ込み・あり',s.agitation='あり'),('イレ込み・強',s.agitation='強'),
   ('発汗・あり',s.sweating='あり'),('発汗・強',s.sweating='強'),('早歩き',s.fast_walking),
   ('チャカつき・1600m以下',s.chaka and s.distance<=1600),
   ('チャカつき・1800m以上',s.chaka and s.distance>=1800)) x(key,chosen) where x.chosen)
 select key,count(*),count(*) filter(where outcome_status='placed'),
   count(*) filter(where outcome_status='finished_other'),count(*) filter(where outcome_status='dnf'),
   count(*) filter(where outcome_status='scratched') from expanded group by key order by key
$$;

revoke all on function public.save_suitability_research(jsonb,jsonb),public.save_condition_research(jsonb,jsonb),
 public.research_suitability_distribution(jsonb,boolean),public.research_condition_summary(jsonb) from public,anon,authenticated;
grant execute on function public.save_suitability_research(jsonb,jsonb),public.save_condition_research(jsonb,jsonb),
 public.research_suitability_distribution(jsonb,boolean),public.research_condition_summary(jsonb) to authenticated;
