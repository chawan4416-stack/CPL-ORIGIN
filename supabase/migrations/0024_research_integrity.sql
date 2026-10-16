-- Additive correction after 0023: official first place and unique popularity among recorded condition horses.
create unique index condition_recorded_popularity_uidx
 on public.condition_observations(race_id,popularity) where popularity is not null;

do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('public.save_suitability_research(jsonb,jsonb)'::regprocedure);
 if position('v_id:=cpl_private.ensure_research_race(p_race);' in definition)=0
 then raise exception 'SUITABILITY_FUNCTION_ANCHOR_MISSING'; end if;
 definition:=replace(definition,'v_id:=cpl_private.ensure_research_race(p_race);',
   'if not exists(select 1 from jsonb_array_elements(p_horses) x(value) where (x.value->>''finish_position'')::integer=1)
    then raise exception ''OFFICIAL_FIRST_REQUIRED''; end if;
    v_id:=cpl_private.ensure_research_race(p_race);');
 execute definition;
end $patch$;
revoke all on function public.save_suitability_research(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_suitability_research(jsonb,jsonb) to authenticated;
