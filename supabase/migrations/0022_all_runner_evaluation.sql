-- DRAFT ONLY. Do not apply to production without explicit approval.
-- CPL all-runner evaluations. Existing migrations/tables/functions remain intact.
-- Apply once, after 0021, in an isolated database first.

insert into public.master_options(category, field_key, option_value, sort_order, active)
values ('BODY','FLANK_TUCK','なし',10,true),
       ('BODY','FLANK_TUCK','少しあり',20,true),
       ('BODY','FLANK_TUCK','深い',30,true);

create table public.race_evaluations (
  race_id uuid primary key references public.races(id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed','review_started','results_complete')),
  current_revision_no integer not null default 1 check (current_revision_no >= 1),
  initial_confirmed_at timestamptz not null default now(),
  result_review_started_at timestamptz,
  results_recorded_at timestamptz,
  result_status text check (result_status in ('official','void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint race_evaluations_state_check check (
    (status = 'confirmed' and result_review_started_at is null and results_recorded_at is null and result_status is null)
    or (status = 'review_started' and result_review_started_at is not null and results_recorded_at is null and result_status is null)
    or (status = 'results_complete' and result_review_started_at is not null and results_recorded_at is not null and result_status is not null)
  )
);

create table public.race_evaluation_revisions (
  race_id uuid not null references public.race_evaluations(race_id) on delete cascade,
  revision_no integer not null check (revision_no >= 1),
  revision_kind text not null check (revision_kind in ('initial','correction')),
  knowledge_state text not null check (knowledge_state in ('pre_review','post_review')),
  no_suitable_horse boolean not null,
  no_focus_horse boolean not null,
  correction_note text,
  created_at timestamptz not null default now(),
  primary key (race_id, revision_no),
  constraint race_evaluation_revision_kind_check check (
    (revision_no = 1 and revision_kind = 'initial' and knowledge_state = 'pre_review')
    or (revision_no > 1 and revision_kind = 'correction')
  ),
  constraint race_evaluation_no_focus_check check (not no_suitable_horse or no_focus_horse)
);

create table public.race_runner_evaluations (
  race_id uuid not null,
  revision_no integer not null,
  horse_number smallint not null check (horse_number between 1 and 18),
  entry_status text not null check (entry_status in ('eligible','scratched')),
  chest text,
  hindquarter text,
  gait text,
  balance text,
  tone text,
  flank_tuck text check (flank_tuck in ('なし','少しあり','深い')),
  agitation text check (agitation in ('あり','強')),
  sweating text check (sweating in ('あり','強')),
  fast_walking text check (fast_walking = '早歩き'),
  is_suitable boolean not null,
  is_focus boolean not null,
  primary key (race_id, revision_no, horse_number),
  foreign key (race_id, revision_no)
    references public.race_evaluation_revisions(race_id, revision_no) on delete cascade,
  constraint race_runner_evaluation_shape_check check (
    (entry_status = 'eligible' and chest is not null and hindquarter is not null
      and gait is not null and balance is not null and tone is not null and flank_tuck is not null)
    or (entry_status = 'scratched' and chest is null and hindquarter is null
      and gait is null and balance is null and tone is null and flank_tuck is null
      and agitation is null and sweating is null and fast_walking is null
      and not is_suitable and not is_focus)
  ),
  constraint race_runner_focus_requires_suitable_check check (not is_focus or is_suitable)
);
create unique index race_runner_one_focus_per_revision_uidx
  on public.race_runner_evaluations(race_id, revision_no) where is_focus;

create table public.race_runner_outcomes (
  race_id uuid not null references public.race_evaluations(race_id) on delete cascade,
  horse_number smallint not null check (horse_number between 1 and 18),
  outcome_status text not null
    check (outcome_status in ('placed','finished_other','dnf','scratched')),
  popularity smallint check (popularity between 1 and 18),
  finish_position smallint check (finish_position between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (race_id, horse_number),
  constraint race_runner_outcome_shape_check check (
    (outcome_status = 'scratched' and popularity is null and finish_position is null)
    or (outcome_status in ('finished_other','dnf') and popularity is not null and finish_position is null)
    or (outcome_status = 'placed' and popularity is not null and finish_position is not null)
  )
);
-- Official tied placings can occur at any rank, including rank 3; no uniqueness
-- constraint on (race_id, finish_position). A void race has no outcome rows.
create unique index race_runner_started_popularity_uidx
  on public.race_runner_outcomes(race_id, popularity)
  where popularity is not null;

-- Legacy save_race(p_race_id=...) remains available for legacy races, but cannot
-- silently rewrite the header of an all-runner race and desynchronize its snapshots.
create function public.prevent_evaluated_race_header_overwrite() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from public.race_evaluations e where e.race_id=old.id) then
    raise exception 'EVALUATED_RACE_HEADER_LOCKED';
  end if;
  return new;
end;
$$;
create trigger races_lock_evaluated_header before update of
  race_date,racecourse,race_number,course,surface,distance,race_class,track_condition,field_size
on public.races for each row
execute function public.prevent_evaluated_race_header_overwrite();

create function public.set_race_evaluations_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger race_evaluations_set_updated_at before update on public.race_evaluations
for each row execute function public.set_race_evaluations_updated_at();
create trigger race_runner_outcomes_set_updated_at before update on public.race_runner_outcomes
for each row execute function public.set_race_evaluations_updated_at();

alter table public.race_evaluations enable row level security;
alter table public.race_evaluation_revisions enable row level security;
alter table public.race_runner_evaluations enable row level security;
alter table public.race_runner_outcomes enable row level security;

create policy race_evaluations_own_read on public.race_evaluations
for select to authenticated using (race_id in (
  select r.id from public.races r where r.created_by = (select auth.uid())
));
create policy race_evaluation_revisions_own_read on public.race_evaluation_revisions
for select to authenticated using (race_id in (
  select r.id from public.races r where r.created_by = (select auth.uid())
));
create policy race_runner_evaluations_own_read on public.race_runner_evaluations
for select to authenticated using (race_id in (
  select r.id from public.races r where r.created_by = (select auth.uid())
));
create policy race_runner_outcomes_own_read on public.race_runner_outcomes
for select to authenticated using (race_id in (
  select r.id from public.races r where r.created_by = (select auth.uid())
));

-- SQL-created public objects can inherit permissive default grants. Explicitly narrow them.
revoke all on public.race_evaluations, public.race_evaluation_revisions,
  public.race_runner_evaluations, public.race_runner_outcomes from public, anon, authenticated;
grant select on public.race_evaluations, public.race_evaluation_revisions,
  public.race_runner_evaluations, public.race_runner_outcomes to authenticated;

create schema if not exists cpl_private;
revoke all on schema cpl_private from public, anon, authenticated;

-- Called only by the write RPCs. Checks the entire, consecutively numbered field.
create function cpl_private.validate_runner_snapshot(
  p_race_id uuid, p_runners jsonb, p_no_suitable boolean, p_no_focus boolean
) returns void language plpgsql set search_path = '' as $$
declare
  v_size integer;
  v_runner jsonb;
  v_field text;
  v_selected integer := 0;
  v_focus integer := 0;
  v_eligible integer := 0;
begin
  select r.field_size into v_size from public.races r where r.id = p_race_id;
  if v_size is null or p_no_suitable is null or p_no_focus is null
    or p_runners is null or jsonb_typeof(p_runners) <> 'array' then
    raise exception 'INVALID_EVALUATION';
  end if;
  if jsonb_array_length(p_runners) <> v_size then raise exception 'RUNNER_COUNT_MISMATCH'; end if;

  for v_runner in select value from jsonb_array_elements(p_runners) as x(value) loop
    if jsonb_typeof(v_runner) <> 'object'
      or coalesce(v_runner->>'horse_number','') !~ '^[0-9]+$'
      or (v_runner->>'horse_number')::integer not between 1 and v_size
      or v_runner->>'entry_status' not in ('eligible','scratched')
      or jsonb_typeof(v_runner->'is_suitable') is distinct from 'boolean'
      or jsonb_typeof(v_runner->'is_focus') is distinct from 'boolean'
    then raise exception 'INVALID_RUNNER'; end if;

    if v_runner->>'entry_status' = 'scratched' then
      if (v_runner->>'is_suitable')::boolean or (v_runner->>'is_focus')::boolean
        or exists(select 1 from unnest(array['chest','hindquarter','gait','balance',
          'tone','flank_tuck','agitation','sweating','fast_walking']) as f(key)
          where nullif(v_runner->>f.key,'') is not null)
      then raise exception 'INVALID_SCRATCHED_EVALUATION'; end if;
    else
      v_eligible := v_eligible + 1;
      foreach v_field in array array['CHEST','HINDQUARTER','GAIT','BALANCE','TONE','FLANK_TUCK'] loop
        if not exists (select 1 from public.master_options m
          where m.category='BODY' and m.field_key=v_field
            and m.option_value=v_runner->>lower(v_field) and m.active)
        then raise exception 'INVALID_BODY_MASTER:%', v_field; end if;
      end loop;
      foreach v_field in array array['AGITATION','SWEATING','FAST_WALKING'] loop
        if nullif(v_runner->>lower(v_field),'') is not null
          and not exists (select 1 from public.master_options m
            where m.category='BODY' and m.field_key=v_field
              and m.option_value=v_runner->>lower(v_field) and m.active)
        then raise exception 'INVALID_BODY_MASTER:%', v_field; end if;
      end loop;
    end if;

    if (v_runner->>'is_suitable')::boolean then v_selected := v_selected + 1; end if;
    if (v_runner->>'is_focus')::boolean then
      if not (v_runner->>'is_suitable')::boolean then raise exception 'FOCUS_NOT_SUITABLE'; end if;
      v_focus := v_focus + 1;
    end if;
  end loop;

  if v_eligible = 0 then raise exception 'NO_ELIGIBLE_RUNNERS'; end if;
  if (select count(distinct (x.value->>'horse_number')::integer)
      from jsonb_array_elements(p_runners) as x(value)) <> v_size
  then raise exception 'DUPLICATE_HORSE_NUMBER'; end if;
  if v_focus > 1 then raise exception 'MULTIPLE_FOCUS_HORSES'; end if;
  if p_no_suitable is distinct from (v_selected = 0)
    or p_no_focus is distinct from (v_focus = 0)
  then raise exception 'SELECTION_STATE_MISMATCH'; end if;
end;
$$;
revoke all on function cpl_private.validate_runner_snapshot(uuid,jsonb,boolean,boolean)
  from public, anon, authenticated;

-- The first decision and the race header are committed in one transaction.
create function public.confirm_race_evaluation(
  p_race jsonb, p_runners jsonb, p_no_suitable boolean, p_no_focus boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_item jsonb;
  v_course text;
  v_class text;
  v_has_cd boolean;
  v_has_class boolean;
  v_layouts integer;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_race is null or jsonb_typeof(p_race) <> 'object'
    or (p_race->>'race_date')::date is null
    or (p_race->>'race_number')::integer not between 1 and 12
    or (p_race->>'field_size')::integer not between 1 and 18
    or (p_race->>'distance')::integer <= 0
  then raise exception 'INVALID_RACE_DATA'; end if;

  if not exists(select 1 from public.master_options m where m.category='RACE'
    and m.field_key='RACECOURSE' and m.option_value=p_race->>'racecourse' and m.active)
    or not exists(select 1 from public.master_options m where m.category='RACE'
      and m.field_key='SURFACE' and m.option_value=p_race->>'surface' and m.active)
    or not exists(select 1 from public.master_options m where m.category='RACE'
      and m.field_key='TRACK_CONDITION' and m.option_value=p_race->>'track_condition' and m.active)
  then raise exception 'INVALID_RACE_MASTER'; end if;

  v_course := nullif(p_race->>'course','');
  select exists(select 1 from public.master_options m where m.category='COURSE_DISTANCE'
    and m.field_key like concat(p_race->>'racecourse',':%') and m.active) into v_has_cd;
  if v_has_cd then
    select count(*) into v_layouts from public.master_options m
      where m.category='COURSE_DISTANCE'
        and m.field_key=concat(p_race->>'racecourse',':',p_race->>'surface',':',p_race->>'distance')
        and m.active;
    if v_layouts = 0 or (v_layouts > 1 and v_course is null)
      or not exists(select 1 from public.master_options m where m.category='COURSE_DISTANCE'
        and m.field_key=concat(p_race->>'racecourse',':',p_race->>'surface',':',p_race->>'distance')
        and m.option_value=v_course and m.active)
    then raise exception 'INVALID_COURSE_DISTANCE_MASTER'; end if;
  elsif not exists(select 1 from public.master_options m where m.category='COURSE'
    and m.field_key=p_race->>'racecourse' and m.option_value=v_course and m.active)
    or not exists(select 1 from public.master_options m where m.category='DISTANCE'
      and m.field_key=p_race->>'racecourse' and m.option_value=p_race->>'distance' and m.active)
  then raise exception 'INVALID_COURSE_MASTER'; end if;

  select exists(select 1 from public.master_options m where m.category='RACE_CLASS'
    and m.field_key=p_race->>'racecourse' and m.active) into v_has_class;
  v_class := nullif(p_race->>'race_class','');
  if (v_has_class and (v_class is null or not exists(select 1 from public.master_options m
      where m.category='RACE_CLASS' and m.field_key=p_race->>'racecourse'
        and m.option_value=v_class and m.active)))
    or (not v_has_class and v_class is not null)
  then raise exception 'INVALID_RACE_CLASS_MASTER'; end if;

  -- No overwrite: the existing legacy race remains untouched.
  if exists(select 1 from public.races r where r.created_by=(select auth.uid())
    and r.race_date=(p_race->>'race_date')::date
    and r.racecourse=p_race->>'racecourse'
    and r.race_number=(p_race->>'race_number')::smallint)
  then raise exception 'RACE_ALREADY_EXISTS'; end if;

  insert into public.races(race_date,racecourse,race_number,course,surface,distance,
    race_class,track_condition,field_size,created_by)
  values ((p_race->>'race_date')::date,p_race->>'racecourse',
    (p_race->>'race_number')::smallint,v_course,p_race->>'surface',
    (p_race->>'distance')::integer,v_class,p_race->>'track_condition',
    (p_race->>'field_size')::smallint,(select auth.uid())) returning id into v_id;

  perform cpl_private.validate_runner_snapshot(v_id,p_runners,p_no_suitable,p_no_focus);
  insert into public.race_evaluations(race_id) values (v_id);
  insert into public.race_evaluation_revisions(
    race_id,revision_no,revision_kind,knowledge_state,no_suitable_horse,no_focus_horse)
  values (v_id,1,'initial','pre_review',p_no_suitable,p_no_focus);

  for v_item in select value from jsonb_array_elements(p_runners) as x(value) loop
    insert into public.race_runner_evaluations(
      race_id,revision_no,horse_number,entry_status,chest,hindquarter,gait,balance,
      tone,flank_tuck,agitation,sweating,fast_walking,is_suitable,is_focus)
    values (v_id,1,(v_item->>'horse_number')::smallint,v_item->>'entry_status',
      nullif(v_item->>'chest',''),nullif(v_item->>'hindquarter',''),
      nullif(v_item->>'gait',''),nullif(v_item->>'balance',''),
      nullif(v_item->>'tone',''),nullif(v_item->>'flank_tuck',''),
      nullif(v_item->>'agitation',''),nullif(v_item->>'sweating',''),
      nullif(v_item->>'fast_walking',''),
      (v_item->>'is_suitable')::boolean,(v_item->>'is_focus')::boolean);
  end loop;
  return v_id;
end;
$$;

-- Called and awaited BEFORE the client reveals popularity or results.
-- It is intentionally irreversible, even if the browser is closed without saving results.
create function public.begin_result_review(p_race_id uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_started timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select e.result_review_started_at into v_started
  from public.race_evaluations e join public.races r on r.id=e.race_id
  where e.race_id=p_race_id and r.created_by=(select auth.uid())
  for update of e;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if v_started is null then
    update public.race_evaluations e set status='review_started',
      result_review_started_at=clock_timestamp()
    where e.race_id=p_race_id
    returning e.result_review_started_at into v_started;
  end if;
  return v_started;
end;
$$;

create function public.revise_race_evaluation(
  p_race_id uuid, p_expected_revision integer, p_runners jsonb,
  p_no_suitable boolean, p_no_focus boolean, p_note text default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_current integer;
  v_review_started timestamptz;
  v_next integer;
  v_item jsonb;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select e.current_revision_no,e.result_review_started_at
    into v_current,v_review_started
  from public.race_evaluations e join public.races r on r.id=e.race_id
  where e.race_id=p_race_id and r.created_by=(select auth.uid())
  for update of e;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if p_expected_revision is distinct from v_current then raise exception 'STALE_REVISION'; end if;
  perform cpl_private.validate_runner_snapshot(p_race_id,p_runners,p_no_suitable,p_no_focus);

  -- A horse that actually started must never be newly recoded as unassessed/scratched.
  -- A subsequently scratched horse may retain the evaluation made before the scratch;
  -- outcome_status, not the historical entry_status, controls aggregate denominators.
  if exists(select 1 from public.race_runner_outcomes o
    join lateral jsonb_array_elements(p_runners) as x(value)
      on (x.value->>'horse_number')::smallint=o.horse_number
    where o.race_id=p_race_id
      and o.outcome_status<>'scratched'
      and x.value->>'entry_status'='scratched')
  then raise exception 'OUTCOME_STATUS_CONFLICT'; end if;

  v_next := v_current + 1;
  insert into public.race_evaluation_revisions(
    race_id,revision_no,revision_kind,knowledge_state,no_suitable_horse,no_focus_horse,correction_note)
  values (p_race_id,v_next,'correction',
    case when v_review_started is null then 'pre_review' else 'post_review' end,
    p_no_suitable,p_no_focus,nullif(btrim(p_note),''));

  for v_item in select value from jsonb_array_elements(p_runners) as x(value) loop
    insert into public.race_runner_evaluations(
      race_id,revision_no,horse_number,entry_status,chest,hindquarter,gait,balance,
      tone,flank_tuck,agitation,sweating,fast_walking,is_suitable,is_focus)
    values (p_race_id,v_next,(v_item->>'horse_number')::smallint,v_item->>'entry_status',
      nullif(v_item->>'chest',''),nullif(v_item->>'hindquarter',''),
      nullif(v_item->>'gait',''),nullif(v_item->>'balance',''),
      nullif(v_item->>'tone',''),nullif(v_item->>'flank_tuck',''),
      nullif(v_item->>'agitation',''),nullif(v_item->>'sweating',''),
      nullif(v_item->>'fast_walking',''),
      (v_item->>'is_suitable')::boolean,(v_item->>'is_focus')::boolean);
  end loop;
  update public.race_evaluations e set current_revision_no=v_next where e.race_id=p_race_id;
  return v_next;
end;
$$;

create function public.save_race_outcomes(p_race_id uuid, p_result_status text, p_outcomes jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_size integer;
  v_current integer;
  v_started timestamptz;
  v_item jsonb;
  v_status text;
  v_popularity integer;
  v_finish integer;
  v_starters integer := 0;
  v_first integer := 0;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select r.field_size,e.current_revision_no,e.result_review_started_at
    into v_size,v_current,v_started
  from public.race_evaluations e join public.races r on r.id=e.race_id
  where e.race_id=p_race_id and r.created_by=(select auth.uid())
  for update of e;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if v_started is null then raise exception 'RESULT_REVIEW_NOT_STARTED'; end if;
  if p_result_status not in ('official','void') or p_result_status is null
  then raise exception 'INVALID_RESULT_STATUS'; end if;
  if p_result_status='void' then
    if p_outcomes is not null and p_outcomes <> '[]'::jsonb
    then raise exception 'VOID_RACE_HAS_OUTCOMES'; end if;
    -- Preserve all full evaluation snapshots, including corrections after review.
    -- Replacing a previously entered result with an official void decision is atomic.
    delete from public.race_runner_outcomes o where o.race_id=p_race_id;
    update public.race_evaluations e set status='results_complete',result_status='void',
      results_recorded_at=coalesce(e.results_recorded_at,now())
    where e.race_id=p_race_id;
    return;
  end if;
  if p_outcomes is null or jsonb_typeof(p_outcomes)<>'array' then
    raise exception 'INVALID_OUTCOMES'; end if;
  if jsonb_array_length(p_outcomes)<>v_size then raise exception 'OUTCOME_COUNT_MISMATCH'; end if;

  for v_item in select value from jsonb_array_elements(p_outcomes) as x(value) loop
    if jsonb_typeof(v_item)<>'object'
      or coalesce(v_item->>'horse_number','') !~ '^[0-9]+$'
      or (v_item->>'horse_number')::integer not between 1 and v_size
    then raise exception 'INVALID_OUTCOME_HORSE_NUMBER'; end if;
    v_status := v_item->>'outcome_status';
    if v_status is null or v_status not in ('placed','finished_other','dnf','scratched')
    then raise exception 'INVALID_OUTCOME_STATUS'; end if;

    if v_status='scratched' then
      if nullif(v_item->>'popularity','') is not null or
        nullif(v_item->>'finish_position','') is not null
      then raise exception 'SCRATCHED_HAS_RESULT'; end if;
    else
      v_starters:=v_starters+1;
      if coalesce(v_item->>'popularity','') !~ '^[0-9]+$'
      then raise exception 'POPULARITY_REQUIRED'; end if;
      v_popularity:=(v_item->>'popularity')::integer;
      if v_popularity not between 1 and v_size then raise exception 'INVALID_POPULARITY'; end if;
      if v_status='placed' then
        if coalesce(v_item->>'finish_position','') !~ '^[1-3]$'
        then raise exception 'INVALID_FINISH_POSITION'; end if;
        if v_item->>'finish_position'='1' then v_first:=v_first+1; end if;
      elsif nullif(v_item->>'finish_position','') is not null then
        raise exception 'NON_PLACED_HAS_FINISH';
      end if;
    end if;
  end loop;
  -- Do not assume three distinct placed horses: official ties may yield >3;
  -- a race with fewer than three finishers may still have an official result.
  if v_starters<1 or v_first<1 then raise exception 'OFFICIAL_FIRST_REQUIRED'; end if;
  if (select count(distinct (x.value->>'horse_number')::integer)
      from jsonb_array_elements(p_outcomes) as x(value))<>v_size
  then raise exception 'DUPLICATE_HORSE_NUMBER'; end if;
  if (select count(distinct (x.value->>'popularity')::integer)
      from jsonb_array_elements(p_outcomes) as x(value)
      where x.value->>'outcome_status'<>'scratched')<>v_starters
    or exists(select 1 from jsonb_array_elements(p_outcomes) as x(value)
      where x.value->>'outcome_status'<>'scratched'
        and (x.value->>'popularity')::integer>v_starters)
  then raise exception 'INVALID_POPULARITY_RANKS'; end if;
  -- Record the JRA-published rank for each horse; rank gaps caused by ties
  -- are not filled in or inferred from pari-mutuel payout rules.
  if exists (
    select 1 from (values (2),(3)) as ranks(rank_no)
    where exists (select 1 from jsonb_array_elements(p_outcomes) as x(value)
      where (x.value->>'finish_position')::integer=ranks.rank_no)
      and (select count(*) from jsonb_array_elements(p_outcomes) as x(value)
        where (x.value->>'finish_position')::integer<ranks.rank_no)<>ranks.rank_no-1
  ) then raise exception 'INVALID_OFFICIAL_RANK_SEQUENCE'; end if;
  if exists(select 1 from public.race_runner_evaluations b
    join lateral jsonb_array_elements(p_outcomes) as x(value)
      on (x.value->>'horse_number')::smallint=b.horse_number
    where b.race_id=p_race_id and b.revision_no=v_current
      and b.entry_status='scratched' and x.value->>'outcome_status'<>'scratched')
  then raise exception 'PRECONFIRMED_SCRATCH_STARTED'; end if;

  -- Atomic replace is for correction of factual results, never of evaluation revisions.
  delete from public.race_runner_outcomes o where o.race_id=p_race_id;
  for v_item in select value from jsonb_array_elements(p_outcomes) as x(value) loop
    insert into public.race_runner_outcomes(
      race_id,horse_number,outcome_status,popularity,finish_position)
    values (p_race_id,(v_item->>'horse_number')::smallint,v_item->>'outcome_status',
      nullif(v_item->>'popularity','')::smallint,
      nullif(v_item->>'finish_position','')::smallint);
  end loop;
  update public.race_evaluations e set status='results_complete',result_status='official',
    results_recorded_at=coalesce(e.results_recorded_at,now())
    where e.race_id=p_race_id;
end;
$$;

revoke all on function public.set_race_evaluations_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_evaluated_race_header_overwrite() from public, anon, authenticated;
revoke all on function public.confirm_race_evaluation(jsonb,jsonb,boolean,boolean)
  from public, anon, authenticated;
revoke all on function public.begin_result_review(uuid) from public, anon, authenticated;
revoke all on function public.revise_race_evaluation(uuid,integer,jsonb,boolean,boolean,text)
  from public, anon, authenticated;
revoke all on function public.save_race_outcomes(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.confirm_race_evaluation(jsonb,jsonb,boolean,boolean)
  to authenticated;
grant execute on function public.begin_result_review(uuid) to authenticated;
grant execute on function public.revise_race_evaluation(uuid,integer,jsonb,boolean,boolean,text)
  to authenticated;
grant execute on function public.save_race_outcomes(uuid,text,jsonb) to authenticated;
