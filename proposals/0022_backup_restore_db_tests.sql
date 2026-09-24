-- 0022 version 6 database round-trip rehearsal. Development DB ONLY.
-- Requires the same dev-only gate and session settings as
-- proposals/0022_all_runner_db_tests.sql. Entire fixture is rolled back.
begin;
do $$ begin
  if current_setting('cpl.disposable_test_db',true) is distinct from 'on'
    or to_regclass('cpl_private.development_test_gate') is null
  then raise exception 'DISPOSABLE_DATABASE_ONLY'; end if;
  if not exists(select 1 from cpl_private.development_test_gate
    where project_ref=current_setting('cpl.test.dev_project_ref',true)
      and project_ref<>'ekgislctkribtztazvsd')
  then raise exception 'WRONG_DEVELOPMENT_PROJECT'; end if;
end $$;

select set_config('cpl.restore.user_id',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,created_at,updated_at)
values (current_setting('cpl.restore.user_id')::uuid,'authenticated','authenticated',
  'cpl_restore_test@example.invalid',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('cpl.restore.user_id'),true);
select set_config('cpl.restore.race_id', public.confirm_race_evaluation(
  jsonb_build_object('race_date','2026-09-27','racecourse','中山',
    'race_number',1,'surface','芝','distance',2000,'course','内回り',
    'race_class','未勝利','track_condition','良','field_size',4),
  (select jsonb_agg(jsonb_build_object('horse_number',n,'entry_status','eligible',
    'chest','厚','hindquarter','シャープ','gait','普通','balance','均整',
    'tone','パンパン','flank_tuck','なし','is_suitable',n=1,'is_focus',n=1) order by n)
   from generate_series(1,4) n),false,false)::text,true);
select public.begin_result_review(current_setting('cpl.restore.race_id')::uuid);
select public.revise_race_evaluation(current_setting('cpl.restore.race_id')::uuid,1,
  (select jsonb_agg(jsonb_build_object('horse_number',n,'entry_status','eligible',
    'chest','厚','hindquarter','シャープ','gait','普通','balance','均整',
    'tone','パンパン','flank_tuck','深い','is_suitable',n=2,'is_focus',n=2) order by n)
   from generate_series(1,4) n),false,false,'結果確認後の再評価');
select public.save_race_outcomes(current_setting('cpl.restore.race_id')::uuid,'official',
  '[{"horse_number":1,"outcome_status":"placed","popularity":1,"finish_position":1},
    {"horse_number":2,"outcome_status":"placed","popularity":2,"finish_position":2},
    {"horse_number":3,"outcome_status":"placed","popularity":3,"finish_position":3},
    {"horse_number":4,"outcome_status":"placed","popularity":4,"finish_position":3}]'::jsonb);
reset role;

-- Simulates the six table arrays in a version 6 backup. Persist this JSONB
-- temporarily in the transaction, delete only the synthetic test race, and
-- restore parents before children with all column values and timestamps.
create function pg_temp.capture_cpl_v6_fixture(p_race_id uuid) returns jsonb
language sql stable set search_path='' as $$
select jsonb_build_object(
  'backup_version',6,
  'races',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb)
    from public.races r where r.id=p_race_id),
  'race_results',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb)
    from public.race_results x where x.race_id=p_race_id),
  'race_evaluations',(select coalesce(jsonb_agg(to_jsonb(e) order by e.race_id),'[]'::jsonb)
    from public.race_evaluations e where e.race_id=p_race_id),
  'race_evaluation_revisions',(select coalesce(jsonb_agg(to_jsonb(v) order by v.revision_no),'[]'::jsonb)
    from public.race_evaluation_revisions v where v.race_id=p_race_id),
  'race_runner_evaluations',(select coalesce(jsonb_agg(to_jsonb(b) order by b.revision_no,b.horse_number),'[]'::jsonb)
    from public.race_runner_evaluations b where b.race_id=p_race_id),
  'race_runner_outcomes',(select coalesce(jsonb_agg(to_jsonb(o) order by o.horse_number),'[]'::jsonb)
    from public.race_runner_outcomes o where o.race_id=p_race_id)
);
$$;
create temporary table cpl_v6_rehearsal_payload as
select pg_temp.capture_cpl_v6_fixture(current_setting('cpl.restore.race_id')::uuid) as backup;

delete from public.races where id=current_setting('cpl.restore.race_id')::uuid;
do $$ begin
  if exists(select 1 from public.race_evaluation_revisions
    where race_id=current_setting('cpl.restore.race_id')::uuid)
  then raise exception 'TEST_RACE_NOT_ISOLATED'; end if;
end $$;

insert into public.races
select (jsonb_populate_record(null::public.races,x.item)).*
from cpl_v6_rehearsal_payload p cross join lateral jsonb_array_elements(p.backup->'races') as x(item);
insert into public.race_results
select (jsonb_populate_record(null::public.race_results,x.item)).*
from cpl_v6_rehearsal_payload p cross join lateral jsonb_array_elements(p.backup->'race_results') as x(item);
insert into public.race_evaluations
select (jsonb_populate_record(null::public.race_evaluations,x.item)).*
from cpl_v6_rehearsal_payload p cross join lateral jsonb_array_elements(p.backup->'race_evaluations') as x(item);
insert into public.race_evaluation_revisions
select (jsonb_populate_record(null::public.race_evaluation_revisions,x.item)).*
from cpl_v6_rehearsal_payload p cross join lateral jsonb_array_elements(p.backup->'race_evaluation_revisions') as x(item);
insert into public.race_runner_evaluations
select (jsonb_populate_record(null::public.race_runner_evaluations,x.item)).*
from cpl_v6_rehearsal_payload p cross join lateral jsonb_array_elements(p.backup->'race_runner_evaluations') as x(item);
insert into public.race_runner_outcomes
select (jsonb_populate_record(null::public.race_runner_outcomes,x.item)).*
from cpl_v6_rehearsal_payload p cross join lateral jsonb_array_elements(p.backup->'race_runner_outcomes') as x(item);

do $$ begin
  if (select backup from cpl_v6_rehearsal_payload) is distinct from
    pg_temp.capture_cpl_v6_fixture(current_setting('cpl.restore.race_id')::uuid)
  then raise exception 'RESTORE_ROUND_TRIP_MISMATCH'; end if;
  if (select count(*) from public.race_runner_outcomes
      where race_id=current_setting('cpl.restore.race_id')::uuid
        and finish_position between 1 and 3)<>4
    or (select count(*) from public.race_evaluation_revisions
      where race_id=current_setting('cpl.restore.race_id')::uuid)<>2
  then raise exception 'TIED_RESULTS_OR_REVISIONS_MISSING_AFTER_RESTORE'; end if;
end $$;
rollback;
