-- CPL-DEV only. The former condition observations were disposable test data.
-- This migration does not touch races, suitability observations, or other research.
delete from public.condition_observations;

drop index if exists public.condition_recorded_popularity_uidx;
alter table public.condition_observations
  drop constraint condition_observations_pkey,
  drop constraint condition_observations_horse_number_check,
  drop constraint condition_observations_finish_position_check,
  drop constraint condition_observations_outcome_status_check,
  drop constraint condition_result_check,
  drop column horse_number;

alter table public.condition_observations
  add column id uuid not null default gen_random_uuid(),
  add constraint condition_observations_pkey primary key (id),
  add constraint condition_observations_finish_position_check
    check (finish_position between 1 and 18),
  add constraint condition_observations_outcome_status_check
    check (outcome_status in ('finished','dnf','scratched')),
  add constraint condition_result_check check (
    (outcome_status='finished' and finish_position is not null and popularity is not null) or
    (outcome_status='dnf' and finish_position is null and popularity is not null) or
    (outcome_status='scratched' and finish_position is null and popularity is null)
  );
create index condition_race_idx on public.condition_observations(race_id);

-- The UUID identifies an observation. Neither rank nor popularity is a surrogate horse key.
create or replace function public.save_condition_research(p_race jsonb,p_horse jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_race_id uuid; v_size integer; v_status text; v_rank integer; v_pop integer; v_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_horse is null or jsonb_typeof(p_horse)<>'object' or p_horse ? 'horse_number'
 then raise exception 'INVALID_CONDITION'; end if;
 v_size:=(p_race->>'field_size')::integer;
 v_status:=p_horse->>'outcome_status';
 v_rank:=nullif(p_horse->>'finish_position','')::integer;
 v_pop:=nullif(p_horse->>'popularity','')::integer;
 v_id:=nullif(p_horse->>'id','')::uuid;
 if v_size not between 1 and 18 or v_status is null or v_status not in ('finished','dnf','scratched')
   or (coalesce((p_horse->>'chaka')::boolean,false)=false and coalesce((p_horse->>'awkward_gait')::boolean,false)=false
      and nullif(p_horse->>'agitation','') is null and nullif(p_horse->>'sweating','') is null
      and coalesce((p_horse->>'fast_walking')::boolean,false)=false)
   or (nullif(p_horse->>'agitation','') is not null and p_horse->>'agitation' not in ('あり','強'))
   or (nullif(p_horse->>'sweating','') is not null and p_horse->>'sweating' not in ('あり','強'))
   or (v_status='finished' and (v_rank is null or v_rank not between 1 and v_size or v_pop is null or v_pop not between 1 and v_size))
   or (v_status='dnf' and (v_rank is not null or v_pop is null or v_pop not between 1 and v_size))
   or (v_status='scratched' and (v_rank is not null or v_pop is not null))
 then raise exception 'INVALID_CONDITION'; end if;
 v_race_id:=cpl_private.ensure_research_race(p_race);
 if v_id is not null then
   update public.condition_observations set
     chaka=coalesce((p_horse->>'chaka')::boolean,false),
     awkward_gait=coalesce((p_horse->>'awkward_gait')::boolean,false),
     agitation=nullif(p_horse->>'agitation',''),sweating=nullif(p_horse->>'sweating',''),
     fast_walking=coalesce((p_horse->>'fast_walking')::boolean,false),
     outcome_status=v_status,finish_position=v_rank,popularity=v_pop,updated_at=now()
   where id=v_id and race_id=v_race_id;
   if not found then raise exception 'CONDITION_NOT_FOUND'; end if;
 else
   insert into public.condition_observations
     (race_id,chaka,awkward_gait,agitation,sweating,fast_walking,outcome_status,finish_position,popularity)
   values(v_race_id,coalesce((p_horse->>'chaka')::boolean,false),coalesce((p_horse->>'awkward_gait')::boolean,false),
     nullif(p_horse->>'agitation',''),nullif(p_horse->>'sweating',''),coalesce((p_horse->>'fast_walking')::boolean,false),
     v_status,v_rank,v_pop);
 end if;
 return v_race_id;
end $$;
revoke all on function public.save_condition_research(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_condition_research(jsonb,jsonb) to authenticated;

create or replace function public.research_condition_summary(p_filter jsonb default '{}'::jsonb)
returns table(condition_key text,recorded bigint,placed bigint,other_finish bigint,dnf bigint,scratched bigint)
language sql security invoker set search_path='' as $$
 with selected as (select c.*,r.distance from public.condition_observations c join public.races r on r.id=c.race_id
   where r.created_by=(select auth.uid())
     and (p_filter->>'racecourse' is null or r.racecourse=p_filter->>'racecourse')
     and (p_filter->>'surface' is null or r.surface=p_filter->>'surface')
     and (p_filter->>'course' is null or r.course=p_filter->>'course')
     and (p_filter->>'distance' is null or r.distance=(p_filter->>'distance')::integer)
     and (p_filter->>'track_condition' is null or r.track_condition=p_filter->>'track_condition')),
 expanded as (select x.key,s.outcome_status,s.finish_position from selected s cross join lateral (values
   ('チャカつき',s.chaka),('ぎこちない歩様',s.awkward_gait),
   ('イレ込み・あり',s.agitation='あり'),('イレ込み・強',s.agitation='強'),
   ('発汗・あり',s.sweating='あり'),('発汗・強',s.sweating='強'),('早歩き',s.fast_walking),
   ('チャカつき・1600m以下',s.chaka and s.distance<=1600),
   ('チャカつき・1800m以上',s.chaka and s.distance>=1800)) x(key,chosen) where x.chosen)
 select key,count(*),count(*) filter(where outcome_status='finished' and finish_position between 1 and 3),
   count(*) filter(where outcome_status='finished' and finish_position>=4),
   count(*) filter(where outcome_status='dnf'),count(*) filter(where outcome_status='scratched')
 from expanded group by key order by key
$$;
revoke all on function public.research_condition_summary(jsonb) from public,anon,authenticated;
grant execute on function public.research_condition_summary(jsonb) to authenticated;
