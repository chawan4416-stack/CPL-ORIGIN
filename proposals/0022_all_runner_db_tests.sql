-- DRAFT TESTS. Execute ONLY against a separately provisioned disposable CPL clone
-- after loading migrations 0001..0022, creating the dev-only test gate,
-- and setting cpl.disposable_test_db=on in the SAME session.
-- Never run this script on production. Entire test transaction rolls back.
-- The dev-only gate is described in proposals/0022_dev_db_setup.md.
begin;
do $$ begin
  if current_setting('cpl.disposable_test_db', true) is distinct from 'on'
    or to_regclass('cpl_private.development_test_gate') is null
  then raise exception 'DISPOSABLE_DATABASE_ONLY'; end if;
  if not exists(select 1 from cpl_private.development_test_gate
    where project_ref=current_setting('cpl.test.dev_project_ref',true)
      and project_ref<>'ekgislctkribtztazvsd')
  then raise exception 'WRONG_DEVELOPMENT_PROJECT'; end if;
end $$;

do $$ begin
  if not (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.race_evaluations'::regclass,
      'public.race_evaluation_revisions'::regclass,
      'public.race_runner_evaluations'::regclass,
      'public.race_runner_outcomes'::regclass))
  then raise exception 'RLS_NOT_ENABLED'; end if;
  if has_table_privilege('anon','public.race_evaluations','SELECT')
    or has_table_privilege('authenticated','public.race_runner_evaluations','INSERT')
    or has_table_privilege('authenticated','public.race_runner_outcomes','UPDATE')
    or has_function_privilege('anon',
      'public.confirm_race_evaluation(jsonb,jsonb,boolean,boolean)','EXECUTE')
    or not has_function_privilege('authenticated',
      'public.confirm_race_evaluation(jsonb,jsonb,boolean,boolean)','EXECUTE')
    or has_function_privilege('anon','public.save_race_outcomes(uuid,text,jsonb)','EXECUTE')
    or not has_function_privilege('authenticated',
      'public.save_race_outcomes(uuid,text,jsonb)','EXECUTE')
  then raise exception 'WRONG_API_PRIVILEGES'; end if;
end $$;

select set_config('cpl.test.user_one',gen_random_uuid()::text,true);
select set_config('cpl.test.user_two',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,created_at,updated_at)
values (current_setting('cpl.test.user_one')::uuid,'authenticated','authenticated',
  'cpl_test_one@example.invalid',now(),now()),
  (current_setting('cpl.test.user_two')::uuid,'authenticated','authenticated',
  'cpl_test_two@example.invalid',now(),now());

-- Four declared numbers. #4 initially selected, #1 focused.
select set_config('cpl.test.runners_initial',(
  select jsonb_agg(jsonb_build_object('horse_number',n,'entry_status','eligible',
    'chest','厚','hindquarter','シャープ','gait','普通','balance','均整',
    'tone','パンパン','flank_tuck','なし','is_suitable',n in (1,4),
    'is_focus',n=1) order by n)
  from generate_series(1,4) n
)::text,true);
select set_config('cpl.test.runners_pre_review',(
  select jsonb_agg(jsonb_build_object('horse_number',n,'entry_status','eligible',
    'chest','厚','hindquarter','シャープ','gait','普通','balance','均整',
    'tone','パンパン','flank_tuck','少しあり','is_suitable',n=2,
    'is_focus',n=2) order by n)
  from generate_series(1,4) n
)::text,true);
select set_config('cpl.test.runners_post_review',(
  select jsonb_agg(jsonb_build_object('horse_number',n,'entry_status','eligible',
    'chest','厚','hindquarter','シャープ','gait','普通','balance','均整',
    'tone','パンパン','flank_tuck','深い','is_suitable',n=3,
    'is_focus',n=3) order by n)
  from generate_series(1,4) n
)::text,true);

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('cpl.test.user_one'),true);
select set_config('cpl.test.race_one',public.confirm_race_evaluation(
  jsonb_build_object('race_date','2026-09-26','racecourse','中山',
    'race_number',1,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  current_setting('cpl.test.runners_initial')::jsonb,false,false
)::text,true);

do $$ begin
  if (select count(*) from public.race_runner_evaluations
    where race_id=current_setting('cpl.test.race_one')::uuid) <> 4
  then raise exception 'INITIAL_SNAPSHOT_INCOMPLETE'; end if;
  begin
    perform public.revise_race_evaluation(current_setting('cpl.test.race_one')::uuid,1,
      jsonb_set(current_setting('cpl.test.runners_initial')::jsonb,
        '{0,is_suitable}','false'::jsonb),false,false);
    raise exception 'FOCUS_OUTSIDE_SUITABLE_ACCEPTED';
  exception when others then
    if sqlerrm <> 'FOCUS_NOT_SUITABLE' then raise; end if;
  end;
  begin
    perform public.revise_race_evaluation(current_setting('cpl.test.race_one')::uuid,1,
      jsonb_set(current_setting('cpl.test.runners_initial')::jsonb,
        '{3,is_focus}','true'::jsonb),false,false);
    raise exception 'TWO_FOCUS_HORSES_ACCEPTED';
  exception when others then
    if sqlerrm <> 'MULTIPLE_FOCUS_HORSES' then raise; end if;
  end;
  begin
    perform public.save_race(
      jsonb_build_object('race_date','2026-09-26','racecourse','中山',
        'race_number',1,'surface','芝','distance',2000,'course','内回り',
        'race_class','未勝利','track_condition','良','field_size',4),
      (select jsonb_agg(jsonb_build_object('finish_position',n,'popularity',n,
        'win_odds',2,'chest','厚','hindquarter','シャープ','gait','普通',
        'balance','均整','tone','パンパン','paddock_evaluation','普通') order by n)
       from generate_series(1,3) n),
      current_setting('cpl.test.race_one')::uuid);
    raise exception 'LEGACY_RPC_OVERWROTE_EVALUATED_RACE';
  exception when others then
    if sqlerrm <> 'EVALUATED_RACE_HEADER_LOCKED' then raise; end if;
  end;
  begin
    perform public.confirm_race_evaluation(
      jsonb_build_object('race_date','2026-09-26','racecourse','中山',
        'race_number',1,'surface','芝','distance',2000,'course','内回り',
        'race_class','未勝利','track_condition','良','field_size',4),
      current_setting('cpl.test.runners_initial')::jsonb,false,false);
    raise exception 'DUPLICATE_RACE_ACCEPTED';
  exception when others then
    if sqlerrm <> 'RACE_ALREADY_EXISTS' then raise; end if;
  end;
  begin
    perform public.save_race_outcomes(current_setting('cpl.test.race_one')::uuid,'official','[]'::jsonb);
    raise exception 'OUTCOME_BEFORE_REVIEW_ACCEPTED';
  exception when others then
    if sqlerrm <> 'RESULT_REVIEW_NOT_STARTED' then raise; end if;
  end;
end $$;

select public.revise_race_evaluation(current_setting('cpl.test.race_one')::uuid,1,
  current_setting('cpl.test.runners_pre_review')::jsonb,false,false,'結果確認前の修正');
select set_config('cpl.test.review_started',public.begin_result_review(
  current_setting('cpl.test.race_one')::uuid)::text,true);
do $$ begin
  if (select public.begin_result_review(current_setting('cpl.test.race_one')::uuid))
    is distinct from current_setting('cpl.test.review_started')::timestamptz
  then raise exception 'REVIEW_BOUNDARY_CHANGED'; end if;
end $$;
select public.revise_race_evaluation(current_setting('cpl.test.race_one')::uuid,2,
  current_setting('cpl.test.runners_post_review')::jsonb,false,false,'結果画面を開いた後');

do $$ begin
  if (select string_agg(knowledge_state,',' order by revision_no)
    from public.race_evaluation_revisions
    where race_id=current_setting('cpl.test.race_one')::uuid)
     <> 'pre_review,pre_review,post_review'
    or (select count(*) from public.race_runner_evaluations
      where race_id=current_setting('cpl.test.race_one')::uuid) <> 12
    or (select horse_number from public.race_runner_evaluations
      where race_id=current_setting('cpl.test.race_one')::uuid
        and revision_no=1 and is_focus) <> 1
  then raise exception 'DECISION_SNAPSHOTS_CHANGED'; end if;
  begin
    perform public.revise_race_evaluation(current_setting('cpl.test.race_one')::uuid,1,
      current_setting('cpl.test.runners_post_review')::jsonb,false,false);
    raise exception 'STALE_REVISION_ACCEPTED';
  exception when others then
    if sqlerrm <> 'STALE_REVISION' then raise; end if;
  end;
end $$;

-- Two placed and a DNF plus the third placed: DNF counts as a starter and miss.
select public.save_race_outcomes(current_setting('cpl.test.race_one')::uuid,'official',
  '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
    {"horse_number":2,"outcome_status":"dnf","popularity":2,"finish_position":null},
    {"horse_number":3,"outcome_status":"placed","popularity":3,"finish_position":2},
    {"horse_number":4,"outcome_status":"placed","popularity":4,"finish_position":3}]'::jsonb);
do $$ begin
  if (select count(*) from public.race_runner_outcomes
    where race_id=current_setting('cpl.test.race_one')::uuid
      and outcome_status='dnf' and finish_position is null and popularity=2)<>1
  then raise exception 'DNF_NOT_PERSISTED'; end if;
  begin
    perform public.save_race_outcomes(current_setting('cpl.test.race_one')::uuid,'official',
      '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
        {"horse_number":2,"outcome_status":"dnf","popularity":1,"finish_position":null},
        {"horse_number":3,"outcome_status":"placed","popularity":3,"finish_position":2},
        {"horse_number":4,"outcome_status":"placed","popularity":4,"finish_position":3}]'::jsonb);
    raise exception 'DUPLICATE_POPULARITY_ACCEPTED';
  exception when others then
    if sqlerrm <> 'INVALID_POPULARITY_RANKS' then raise; end if;
  end;
  begin
    perform public.save_race_outcomes(current_setting('cpl.test.race_one')::uuid,'official',
      '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
        {"horse_number":2,"outcome_status":"dnf","popularity":null,"finish_position":null},
        {"horse_number":3,"outcome_status":"placed","popularity":2,"finish_position":2},
        {"horse_number":4,"outcome_status":"placed","popularity":3,"finish_position":3}]'::jsonb);
    raise exception 'DNF_WITHOUT_POPULARITY_ACCEPTED';
  exception when others then
    if sqlerrm <> 'POPULARITY_REQUIRED' then raise; end if;
  end;
end $$;

-- Scratch after initial selection: explicitly null popularity; exclude from rate denominator.
select set_config('cpl.test.race_two',public.confirm_race_evaluation(
  jsonb_build_object('race_date','2026-09-26','racecourse','中山',
    'race_number',2,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  current_setting('cpl.test.runners_initial')::jsonb,false,false
)::text,true);
select public.begin_result_review(current_setting('cpl.test.race_two')::uuid);
select public.save_race_outcomes(current_setting('cpl.test.race_two')::uuid,'official',
  '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
    {"horse_number":2,"outcome_status":"placed","popularity":2,"finish_position":2},
    {"horse_number":3,"outcome_status":"placed","popularity":3,"finish_position":3},
    {"horse_number":4,"outcome_status":"scratched","popularity":null,"finish_position":null}]'::jsonb);

-- Scratch before initial confirmation: no physical assessment required for #4.
select set_config('cpl.test.runners_with_scratch',(
  select jsonb_agg(case when n=4 then
    jsonb_build_object('horse_number',n,'entry_status','scratched',
      'is_suitable',false,'is_focus',false)
    else jsonb_build_object('horse_number',n,'entry_status','eligible',
      'chest','厚','hindquarter','シャープ','gait','普通','balance','均整',
      'tone','パンパン','flank_tuck','なし','is_suitable',false,'is_focus',false)
    end order by n)
  from generate_series(1,4) n
)::text,true);
select set_config('cpl.test.race_three',public.confirm_race_evaluation(
  jsonb_build_object('race_date','2026-09-26','racecourse','中山',
    'race_number',3,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  current_setting('cpl.test.runners_with_scratch')::jsonb,true,true
)::text,true);
select public.begin_result_review(current_setting('cpl.test.race_three')::uuid);
select public.save_race_outcomes(current_setting('cpl.test.race_three')::uuid,'official',
  '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
    {"horse_number":2,"outcome_status":"placed","popularity":2,"finish_position":2},
    {"horse_number":3,"outcome_status":"placed","popularity":3,"finish_position":3},
    {"horse_number":4,"outcome_status":"scratched","popularity":null,"finish_position":null}]'::jsonb);

do $$ declare den integer; num integer; begin
  select count(*) filter (where e.is_suitable),
    count(*) filter (where e.is_suitable and o.finish_position is not null)
  into den,num from public.race_runner_evaluations e
    join public.race_evaluations race on race.race_id=e.race_id
    join public.race_runner_outcomes o
      on o.race_id=e.race_id and o.horse_number=e.horse_number
  where e.race_id=current_setting('cpl.test.race_two')::uuid
    and e.revision_no=1 and race.result_status='official'
    and o.outcome_status<>'scratched';
  if den<>1 or num<>1 then raise exception 'SCRATCHED_SELECTION_IN_DENOMINATOR'; end if;
  if (select count(*) from public.race_runner_evaluations e
    where e.race_id=current_setting('cpl.test.race_three')::uuid
      and e.revision_no=1 and e.entry_status='scratched'
      and e.chest is null and not e.is_suitable)<>1
  then raise exception 'PRECONFIRMED_SCRATCH_NOT_SAVED'; end if;
  if (select no_suitable_horse and no_focus_horse
    from public.race_evaluation_revisions
    where race_id=current_setting('cpl.test.race_three')::uuid and revision_no=1)
    is distinct from true
  then raise exception 'EXPLICIT_NONE_NOT_SAVED'; end if;
end $$;

-- Official ties: two horses may share a published rank. No synthetic rank is
-- inserted. A third-place tie can make the top-three cohort four horses.
do $$
declare
  v_case integer;
  v_race uuid;
  v_ranks integer[];
  v_outcomes jsonb;
  v_expected integer;
begin
  for v_case in 5..7 loop
    v_ranks := case v_case
      when 5 then array[1,1,3,null]::integer[] -- first-place tie, no rank 2
      when 6 then array[1,2,2,null]::integer[] -- second-place tie, no rank 3
      else array[1,2,3,3]::integer[] end; -- third-place tie, four top-three
    v_expected := case when v_case=7 then 4 else 3 end;
    v_race := public.confirm_race_evaluation(
      jsonb_build_object('race_date','2026-09-26','racecourse','中山',
        'race_number',v_case,'surface','芝','distance',2000,'course','内回り',
        'race_class','未勝利','track_condition','良','field_size',4),
      current_setting('cpl.test.runners_initial')::jsonb,false,false);
    perform public.begin_result_review(v_race);
    select jsonb_agg(jsonb_build_object('horse_number',n,
      'outcome_status',case when v_ranks[n] is null then 'finished_other' else 'placed' end,
      'popularity',n,'finish_position',v_ranks[n]) order by n)
    into v_outcomes from generate_series(1,4) n;
    perform public.save_race_outcomes(v_race,'official',v_outcomes);
    if (select count(*) from public.race_runner_outcomes
      where race_id=v_race and finish_position between 1 and 3)<>v_expected
      or (select result_status from public.race_evaluations where race_id=v_race)<>'official'
    then raise exception 'OFFICIAL_TIE_LOST_FOR_CASE_%',v_case; end if;
    if v_case=5 and (select count(*) from public.race_runner_outcomes
      where race_id=v_race and finish_position=2)<>0
    then raise exception 'TIE_RANK_GAP_WAS_FILLED'; end if;
    if v_case=5 then
      begin
        perform public.save_race_outcomes(v_race,'official',
          jsonb_set(v_outcomes,'{2,finish_position}','2'::jsonb));
        raise exception 'INVALID_TIE_RANK_SEQUENCE_ACCEPTED';
      exception when others then
        if sqlerrm<>'INVALID_OFFICIAL_RANK_SEQUENCE' then raise; end if;
      end;
    end if;
    if v_case=7 then perform set_config('cpl.test.third_tie',v_race::text,true); end if;
  end loop;
end $$;

-- Official no-contest: preserve all evaluation versions and the irreversible
-- knowledge boundary; discard factual outcome rows and exclude from all rates.
select set_config('cpl.test.void_race',public.confirm_race_evaluation(
  jsonb_build_object('race_date','2026-09-26','racecourse','中山',
    'race_number',8,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  current_setting('cpl.test.runners_initial')::jsonb,false,false
)::text,true);
select public.revise_race_evaluation(current_setting('cpl.test.void_race')::uuid,1,
  current_setting('cpl.test.runners_pre_review')::jsonb,false,false,'結果を見る前');
select public.begin_result_review(current_setting('cpl.test.void_race')::uuid);
select public.revise_race_evaluation(current_setting('cpl.test.void_race')::uuid,2,
  current_setting('cpl.test.runners_post_review')::jsonb,false,false,'結果を見た後');
select public.save_race_outcomes(current_setting('cpl.test.void_race')::uuid,'official',
  '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
    {"horse_number":2,"outcome_status":"placed","popularity":2,"finish_position":2},
    {"horse_number":3,"outcome_status":"placed","popularity":3,"finish_position":3},
    {"horse_number":4,"outcome_status":"finished_other","popularity":4,"finish_position":null}]'::jsonb);
select public.save_race_outcomes(current_setting('cpl.test.void_race')::uuid,'void');
do $$ declare v_den integer; v_num integer; begin
  if (select count(*) from public.race_evaluation_revisions
    where race_id=current_setting('cpl.test.void_race')::uuid)<>3
    or (select count(*) from public.race_runner_evaluations
      where race_id=current_setting('cpl.test.void_race')::uuid)<>12
    or (select string_agg(knowledge_state,',' order by revision_no)
      from public.race_evaluation_revisions
      where race_id=current_setting('cpl.test.void_race')::uuid)
        <>'pre_review,pre_review,post_review'
    or (select result_status from public.race_evaluations
      where race_id=current_setting('cpl.test.void_race')::uuid)<>'void'
    or exists(select 1 from public.race_runner_outcomes
      where race_id=current_setting('cpl.test.void_race')::uuid)
  then raise exception 'VOID_DAMAGED_EVALUATIONS_OR_LEFT_RESULTS'; end if;
  select count(*) filter (where b.is_suitable),
    count(*) filter (where b.is_suitable and o.finish_position between 1 and 3)
  into v_den,v_num from public.race_runner_evaluations b
    join public.race_evaluations r on r.race_id=b.race_id and r.result_status='official'
    join public.race_runner_outcomes o on o.race_id=b.race_id
      and o.horse_number=b.horse_number and o.outcome_status<>'scratched'
  where b.race_id in (current_setting('cpl.test.void_race')::uuid,
    current_setting('cpl.test.third_tie')::uuid) and b.revision_no=1;
  if v_den<>2 or v_num<>2 then raise exception 'VOID_AFFECTED_RATE'; end if;
  begin
    perform public.save_race_outcomes(current_setting('cpl.test.void_race')::uuid,
      'void','[{"horse_number":1}]'::jsonb);
    raise exception 'VOID_ACCEPTED_OUTCOMES';
  exception when others then
    if sqlerrm<>'VOID_RACE_HAS_OUTCOMES' then raise; end if;
  end;
end $$;

-- Directly void without ever saving results (race 9); no popularity required.
select set_config('cpl.test.direct_void',public.confirm_race_evaluation(
  jsonb_build_object('race_date','2026-09-26','racecourse','中山',
    'race_number',9,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  current_setting('cpl.test.runners_initial')::jsonb,false,false
)::text,true);
select public.begin_result_review(current_setting('cpl.test.direct_void')::uuid);
select public.save_race_outcomes(current_setting('cpl.test.direct_void')::uuid,'void');
do $$ begin
  if (select result_status='void' and result_review_started_at is not null
      and results_recorded_at is not null
      from public.race_evaluations where race_id=current_setting('cpl.test.direct_void')::uuid)
      is distinct from true
    or exists(select 1 from public.race_runner_outcomes
      where race_id=current_setting('cpl.test.direct_void')::uuid)
  then raise exception 'DIRECT_VOID_FAILED'; end if;
end $$;

-- Legacy workflow continues to save its three rows; only new-version races are locked.
select set_config('cpl.test.legacy_race',public.save_race(
  jsonb_build_object('race_date','2026-09-26','racecourse','中山',
    'race_number',4,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  (select jsonb_agg(jsonb_build_object('finish_position',n,'popularity',n,
    'win_odds',2,'chest','厚','hindquarter','シャープ','gait','普通',
    'balance','均整','tone','パンパン','paddock_evaluation','普通') order by n)
   from generate_series(1,3) n)
)::text,true);
do $$ begin
  if (select count(*) from public.race_results
    where race_id=current_setting('cpl.test.legacy_race')::uuid)<>3
    or exists(select 1 from public.race_evaluations
      where race_id=current_setting('cpl.test.legacy_race')::uuid)
  then raise exception 'LEGACY_SAVE_REGRESSION'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('cpl.test.user_two'),true);
do $$ begin
  if exists(select 1 from public.race_evaluations
    where race_id=current_setting('cpl.test.race_one')::uuid)
  then raise exception 'CROSS_USER_READ_ALLOWED'; end if;
  begin
    perform public.begin_result_review(current_setting('cpl.test.race_one')::uuid);
    raise exception 'CROSS_USER_WRITE_ALLOWED';
  exception when others then
    if sqlerrm <> 'RACE_NOT_FOUND' then raise; end if;
  end;
end $$;

reset role;
set local role anon;
do $$ begin
  if has_function_privilege('public.begin_result_review(uuid)','EXECUTE')
    or has_table_privilege('public.race_runner_outcomes','SELECT')
  then raise exception 'ANON_ACCESS_ALLOWED'; end if;
end $$;
reset role;

-- Rows and synthetic auth users are discarded even when every assertion passes.
rollback;
