-- Approved CPL suitability three-axis model. Apply only after a separately reviewed observation reset.
-- No race or unrelated data deletion. Empty-table guard prevents conversion of legacy observations.
do $$ begin
 if exists(select 1 from public.suitability_observations) then
  raise exception 'SUITABILITY_RESET_REQUIRED';
 end if;
end $$;
drop function public.research_suitability_distribution(jsonb,boolean);
alter table public.suitability_observations
 drop constraint suitability_observations_chest_check,
 drop constraint suitability_observations_hindquarter_check,
 drop column tone,
 add constraint suitability_observations_chest_check check (chest in ('シャープ','厚','重厚')),
 add constraint suitability_observations_hindquarter_check check (hindquarter in ('シャープ','厚','重厚')),
 add column hindquarter_density text check (hindquarter_density in ('充足','未充足')),
 add column hindquarter_texture text check (hindquarter_texture in ('標準','張りあり','弾力あり','張りあり＋弾力あり'));
-- NULL is unevaluated; neither column defaults to an observation.
delete from public.master_options where category='SUITABILITY' and
 ((field_key='CHEST' and option_value='厚−') or
 (field_key='HINDQUARTER' and option_value in ('シャープ−','厚−','重厚−')) or
 (field_key='TONE' and option_value in ('パンパン','普通','ゴム感')));
insert into public.master_options(category,field_key,option_value,sort_order,active) values
 ('SUITABILITY','HINDQUARTER_DENSITY','充足',10,true),
 ('SUITABILITY','HINDQUARTER_DENSITY','未充足',20,true),
 ('SUITABILITY','HINDQUARTER_TEXTURE','標準',10,true),
 ('SUITABILITY','HINDQUARTER_TEXTURE','張りあり',20,true),
 ('SUITABILITY','HINDQUARTER_TEXTURE','弾力あり',30,true);
CREATE OR REPLACE FUNCTION public.save_suitability_research(p_race jsonb, p_horses jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_item jsonb; v_size integer;
begin
 if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_horses is null or jsonb_typeof(p_horses)<>'array' or jsonb_array_length(p_horses)<1
   or jsonb_array_length(p_horses)>18 then raise exception 'HORSES_REQUIRED'; end if;
 v_size:=(p_race->>'field_size')::integer;
 for v_item in select value from jsonb_array_elements(p_horses) x(value) loop
   if jsonb_typeof(v_item)<>'object'
      or coalesce(v_item->>'popularity','') !~ '^[0-9]+$'
      or coalesce(v_item->>'finish_position','') !~ '^[1-3]$'
      or coalesce(v_item->>'chest','') not in ('シャープ','厚','重厚')
      or coalesce(v_item->>'hindquarter','') not in ('シャープ','厚','重厚')
      or coalesce(v_item->>'hindquarter_density','') not in ('充足','未充足')
      or coalesce(v_item->>'hindquarter_texture','') not in ('標準','張りあり','弾力あり','張りあり＋弾力あり')
   then raise exception 'INVALID_SUITABILITY'; end if;
   if (v_item->>'popularity')::integer not between 1 and v_size
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
   insert into public.suitability_observations(race_id,popularity,finish_position,chest,hindquarter,hindquarter_density,hindquarter_texture)
   values(v_id,(v_item->>'popularity')::smallint,(v_item->>'finish_position')::smallint,
     v_item->>'chest',v_item->>'hindquarter',v_item->>'hindquarter_density',v_item->>'hindquarter_texture');
 end loop;
 return v_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.research_suitability_distribution(p_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(chest text, hindquarter text, observations bigint, total bigint, percentage numeric, density_breakdown jsonb, texture_breakdown jsonb)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with values_chest as (select unnest(array['シャープ','厚','重厚']) chest),
 values_hind as (select unnest(array['シャープ','厚','重厚']) hindquarter),
 selected as (select s.chest,s.hindquarter,s.hindquarter_density,s.hindquarter_texture
   from public.suitability_observations s join public.races r on r.id=s.race_id
   where r.created_by=(select auth.uid())
     and (p_filter->>'racecourse' is null or r.racecourse=p_filter->>'racecourse')
     and (p_filter->>'surface' is null or r.surface=p_filter->>'surface')
     and (p_filter->>'course' is null or r.course=p_filter->>'course')
     and (p_filter->>'distance' is null or r.distance=(p_filter->>'distance')::integer)
     and (p_filter->>'track_condition' is null or r.track_condition=p_filter->>'track_condition'))
 select c.chest,h.hindquarter,count(s.chest), (select count(*) from selected),
   case when (select count(*) from selected)=0 then 0 else round(count(s.chest)*100.0/(select count(*) from selected),1) end,
   jsonb_build_object('充足',count(*) filter(where s.hindquarter_density='充足'),'未充足',count(*) filter(where s.hindquarter_density='未充足')),
   jsonb_build_object('標準',count(*) filter(where s.hindquarter_texture='標準'),
     '張りあり',count(*) filter(where s.hindquarter_texture='張りあり'),
     '弾力あり',count(*) filter(where s.hindquarter_texture='弾力あり'),
     '張りあり＋弾力あり',count(*) filter(where s.hindquarter_texture='張りあり＋弾力あり'))
 from values_chest c cross join values_hind h left join selected s on s.chest=c.chest and s.hindquarter=h.hindquarter
 group by c.chest,h.hindquarter
 order by array_position(array['シャープ','厚','重厚'],c.chest),
   array_position(array['シャープ','厚','重厚'],h.hindquarter)
$function$
;
revoke all on function public.save_suitability_research(jsonb,jsonb),
 public.research_suitability_distribution(jsonb) from public,anon,authenticated;
grant execute on function public.save_suitability_research(jsonb,jsonb),
 public.research_suitability_distribution(jsonb) to authenticated;
