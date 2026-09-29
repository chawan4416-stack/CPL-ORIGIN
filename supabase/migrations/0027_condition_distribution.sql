-- DEV: observed condition results by official finish position.
-- The invoker's RLS and race ownership both scope the aggregate to their own data.
create function public.research_condition_distribution(p_filter jsonb default '{}'::jsonb)
returns table(condition_key text, outcome_status text, finish_position smallint, observations bigint)
language sql stable security invoker set search_path = '' as $$
  with selected as (
    select c.id, c.chaka, c.awkward_gait, c.agitation, c.sweating, c.fast_walking,
           c.outcome_status, c.finish_position
      from public.condition_observations c
      join public.races r on r.id = c.race_id
     where r.created_by = (select auth.uid())
       and (p_filter->>'racecourse' is null or r.racecourse = p_filter->>'racecourse')
       and (p_filter->>'surface' is null or r.surface = p_filter->>'surface')
       and (p_filter->>'distance' is null or r.distance = (p_filter->>'distance')::integer)
       and (p_filter->>'course' is null or r.course = p_filter->>'course')
       and (p_filter->>'track_condition' is null or r.track_condition = p_filter->>'track_condition')
       and (p_filter->>'race_class' is null or r.race_class = p_filter->>'race_class')
       and (p_filter->>'popularity' is null or c.popularity = (p_filter->>'popularity')::integer)
  ), expanded as (
    select s.id, x.condition_key, s.outcome_status, s.finish_position
      from selected s
      cross join lateral (values
        ('チャカつき', s.chaka),
        ('ぎこちない歩様', s.awkward_gait),
        ('イレ込み・あり', s.agitation = 'あり'),
        ('イレ込み・強', s.agitation = '強'),
        ('発汗・あり', s.sweating = 'あり'),
        ('発汗・強', s.sweating = '強'),
        ('早歩き', s.fast_walking)
      ) x(condition_key, chosen)
     where x.chosen
  )
  select e.condition_key, e.outcome_status, e.finish_position,
         count(distinct e.id) as observations
    from expanded e
   group by e.condition_key, e.outcome_status, e.finish_position
   order by e.condition_key, e.outcome_status, e.finish_position;
$$;
revoke all on function public.research_condition_distribution(jsonb) from public, anon, authenticated;
grant execute on function public.research_condition_distribution(jsonb) to authenticated;
