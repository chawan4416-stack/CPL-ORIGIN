-- Run ONLY in CPL-DEV. Simulated DB JWT claims, not actual Google sign-in.
-- Every fixture and write is rolled back. Never use the production project.
BEGIN;
DO $test$
DECLARE owner_id uuid; outsider uuid:='00000000-0000-4000-8000-000000000002';
 t text; n bigint; f record; race_json jsonb; fixture_id uuid; rejected integer:=0;
 owner_config cpl_private.app_owner%ROWTYPE;
BEGIN
 SELECT user_id INTO STRICT owner_id FROM cpl_private.app_owner
 WHERE environment='dev' AND project_ref='kczisspagwqzdvaeemir';
 SELECT * INTO STRICT owner_config FROM cpl_private.app_owner;
 IF owner_id=outsider THEN RAISE EXCEPTION 'BAD_TEST_PRINCIPAL'; END IF;
 SELECT to_jsonb(r) INTO STRICT race_json FROM (SELECT * FROM public.races ORDER BY id LIMIT 1) r;
 race_json:=race_json||jsonb_build_object('race_date','2099-12-30','race_number',1,'field_size',18,'created_by',outsider);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT public.cpl_is_owner() THEN RAISE EXCEPTION 'OWNER_DENIED'; END IF;
 SELECT count(*) INTO n FROM public.master_options;
 IF n<>470 THEN RAISE EXCEPTION 'OWNER_MASTER_REGRESSION:%',n; END IF;
 SELECT count(*) INTO n FROM public.course_research;
 IF n<>2 THEN RAISE EXCEPTION 'OWNER_COURSE_REGRESSION'; END IF;
 SELECT count(*) INTO n FROM public.research_hypotheses;
 IF n<>2 THEN RAISE EXCEPTION 'OWNER_HYPOTHESIS_REGRESSION'; END IF;
 SELECT count(*) INTO n FROM public.research_suitability_distribution('{}'::jsonb);
 IF n<>9 THEN RAISE EXCEPTION 'OWNER_SUMMARY_REGRESSION'; END IF;
 PERFORM * FROM public.research_condition_summary('{}'::jsonb);
 PERFORM * FROM public.research_condition_distribution('{}'::jsonb);
 fixture_id:=public.save_suitability_research(race_json,
  '[{"finish_position":1,"popularity":1,"chest":"厚","hindquarter":"厚","hindquarter_density":"充足","hindquarter_texture":"標準"},
    {"finish_position":2,"popularity":2,"chest":"シャープ","hindquarter":"厚","hindquarter_density":"未充足","hindquarter_texture":"張りあり"},
    {"finish_position":3,"popularity":3,"chest":"重厚","hindquarter":"重厚","hindquarter_density":"充足","hindquarter_texture":"張りあり＋弾力あり"}]'::jsonb);
 IF NOT EXISTS(SELECT 1 FROM public.races WHERE id=fixture_id AND created_by=owner_id)
 THEN RAISE EXCEPTION 'OWNER_PAYLOAD_SPOOFING'; END IF;
 SELECT count(*) INTO n FROM public.suitability_observations WHERE race_id=fixture_id;
 IF n<>3 THEN RAISE EXCEPTION 'OWNER_SAVE_RESTORE_FAILED'; END IF;
 PERFORM public.save_condition_research(race_json,'{"outcome_status":"finished","finish_position":1,"popularity":1,"chaka":true}'::jsonb);
 SELECT count(*) INTO n FROM public.condition_observations WHERE race_id=fixture_id;
 IF n<>1 THEN RAISE EXCEPTION 'OWNER_CONDITION_REGRESSION'; END IF;

 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF public.cpl_is_owner() THEN RAISE EXCEPTION 'OUTSIDER_ALLOWED'; END IF;
 FOREACH t IN ARRAY ARRAY['races','race_results','master_options','course_research',
  'research_hypotheses','race_evaluations','race_evaluation_revisions',
  'race_runner_evaluations','race_runner_outcomes','suitability_observations','condition_observations']
 LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n<>0 THEN RAISE EXCEPTION 'OUTSIDER_READ:%',t; END IF;
 END LOOP;
 FOR f IN SELECT * FROM (VALUES
  ('save_race','SELECT public.save_race(NULL,NULL,NULL)'),
  ('delete_race',format('SELECT public.delete_race(%L::uuid)',fixture_id)),
  ('confirm_race_evaluation','SELECT public.confirm_race_evaluation(NULL,NULL,NULL,NULL)'),
  ('begin_result_review',format('SELECT public.begin_result_review(%L::uuid)',fixture_id)),
  ('revise_race_evaluation',format('SELECT public.revise_race_evaluation(%L::uuid,NULL,NULL,NULL,NULL,NULL)',fixture_id)),
  ('save_race_outcomes',format('SELECT public.save_race_outcomes(%L::uuid,NULL,NULL)',fixture_id)),
  ('save_suitability_research','SELECT public.save_suitability_research(NULL,NULL)'),
  ('save_condition_research','SELECT public.save_condition_research(NULL,NULL)'),
  ('maintenance_ping','SELECT public.maintenance_ping()'),
  ('research_suitability_distribution','SELECT * FROM public.research_suitability_distribution()'),
  ('research_condition_summary','SELECT * FROM public.research_condition_summary()'),
  ('research_condition_distribution','SELECT * FROM public.research_condition_distribution()')) x(name,sql)
 LOOP
  BEGIN
   EXECUTE f.sql; RAISE EXCEPTION 'OUTSIDER_RPC_ALLOWED:%',f.name;
  EXCEPTION WHEN insufficient_privilege THEN rejected:=rejected+1; END;
 END LOOP;
 IF rejected<>12 THEN RAISE EXCEPTION 'RPC_REJECTION_COUNT:%',rejected; END IF;
 UPDATE public.research_hypotheses SET title=title; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'OUTSIDER_HYPOTHESIS_UPDATE'; END IF;
 DELETE FROM public.research_hypotheses; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'OUTSIDER_HYPOTHESIS_DELETE'; END IF;
 BEGIN
  INSERT INTO public.research_hypotheses(id,title,observation,hypothesis,verification) OVERRIDING SYSTEM VALUE
  VALUES(-999999,'CPL_TEST_PRIVATE_ONLY','test','test','test');
  RAISE EXCEPTION 'OUTSIDER_HYPOTHESIS_INSERT';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.course_research SET title=title; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'OUTSIDER_COURSE_UPDATE'; END IF;
 DELETE FROM public.course_research; GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'OUTSIDER_COURSE_DELETE'; END IF;
 BEGIN
  PERFORM * FROM cpl_private.app_owner;
  RAISE EXCEPTION 'OUTSIDER_CONFIG_READ';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 EXECUTE 'SET LOCAL ROLE anon';
 BEGIN
  PERFORM public.cpl_is_owner(); RAISE EXCEPTION 'ANON_HELPER_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 FOREACH t IN ARRAY ARRAY['races','race_results','master_options','course_research',
  'research_hypotheses','race_evaluations','race_evaluation_revisions',
  'race_runner_evaluations','race_runner_outcomes','suitability_observations','condition_observations']
 LOOP
  BEGIN
   EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
   RAISE EXCEPTION 'ANON_TABLE_ALLOWED:%',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
 WHERE ns.nspname='public' AND p.proname IN ('save_race','delete_race','confirm_race_evaluation',
  'begin_result_review','revise_race_evaluation','save_race_outcomes','save_suitability_research',
  'save_condition_research','maintenance_ping','research_suitability_distribution',
  'research_condition_summary','research_condition_distribution')
 LOOP
  IF has_function_privilege('anon',f.oid,'EXECUTE') THEN RAISE EXCEPTION 'ANON_EXECUTE:%',f.proname; END IF;
 END LOOP;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM public.delete_race(fixture_id);
 IF EXISTS(SELECT 1 FROM public.races WHERE id=fixture_id) THEN RAISE EXCEPTION 'OWNER_DELETE_FAILED'; END IF;
 EXECUTE 'RESET ROLE';
 DELETE FROM cpl_private.app_owner;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF public.cpl_is_owner() THEN RAISE EXCEPTION 'EMPTY_CONFIG_FAIL_OPEN'; END IF;
 BEGIN
  PERFORM public.maintenance_ping(); RAISE EXCEPTION 'EMPTY_CONFIG_RPC_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
 INSERT INTO cpl_private.app_owner SELECT (owner_config).*;
 RAISE NOTICE 'CPL personal-only checks passed: owner save/restore/delete; 11 outsider reads; 12 RPC denials; anon; configuration protection';
END;
$test$;
SELECT 'PASS: owner, outsider 11 tables/12 RPCs, anon, empty configuration, rollback fixtures' AS test_result;
ROLLBACK;
