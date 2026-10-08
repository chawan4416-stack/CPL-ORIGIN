-- CPL personal-only access. UUID configuration is administrative, environment-specific,
-- and deliberately absent from Git. An empty configuration denies every app user.
CREATE TABLE cpl_private.app_owner (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 environment text NOT NULL CHECK (environment IN ('formal','dev')),
 project_ref text NOT NULL CHECK (project_ref ~ '^[a-z]{20}$'),
 configured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cpl_private.app_owner ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cpl_private.app_owner FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.cpl_is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM cpl_private.app_owner WHERE singleton AND user_id=(SELECT auth.uid())
 );
$function$;
REVOKE ALL ON FUNCTION public.cpl_is_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cpl_is_owner() TO anon, authenticated;

CREATE FUNCTION cpl_private.require_cpl_owner() RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $function$
BEGIN
 IF NOT public.cpl_is_owner() THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='CPL_OWNER_REQUIRED';
 END IF;
END;
$function$;
REVOKE ALL ON FUNCTION cpl_private.require_cpl_owner() FROM PUBLIC, anon, authenticated, service_role;

-- Restrictive policies AND with the original ownership policies; they never widen access.
DO $migration$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['races','race_results','master_options','course_research',
  'research_hypotheses','race_evaluations','race_evaluation_revisions',
  'race_runner_evaluations','race_runner_outcomes','suitability_observations','condition_observations']
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY cpl_personal_only ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING ((SELECT public.cpl_is_owner())) WITH CHECK ((SELECT public.cpl_is_owner()))',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon',t);
  EXECUTE format('REVOKE TRUNCATE ON TABLE public.%I FROM authenticated',t);
 END LOOP;
END;
$migration$;

-- Guard every current business RPC before its original body. Preserve signatures,
-- return types, owner, volatility, grants (except anon), and existing ownership checks.
-- Optional DEV-only condition distribution is protected only when present.
DO $migration$
DECLARE f record; source text; definition text; rewritten text; required text;
BEGIN
 FOREACH required IN ARRAY ARRAY['save_race','delete_race','confirm_race_evaluation',
  'begin_result_review','revise_race_evaluation','save_race_outcomes',
  'save_suitability_research','save_condition_research','maintenance_ping',
  'research_suitability_distribution','research_condition_summary']
 LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname=required AND p.prokind='f')
  THEN RAISE EXCEPTION 'MISSING_BUSINESS_RPC:%',required; END IF;
 END LOOP;
 FOR f IN SELECT p.oid,p.proname,p.prosrc, l.lanname,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_functiondef(p.oid) AS def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_language l ON l.oid=p.prolang
  WHERE n.nspname='public' AND p.prokind='f' AND p.proname=ANY(ARRAY[
   'save_race','delete_race','confirm_race_evaluation','begin_result_review',
   'revise_race_evaluation','save_race_outcomes','save_suitability_research',
   'save_condition_research','maintenance_ping','research_suitability_distribution',
   'research_condition_summary','research_condition_distribution'])
 LOOP
  source:=f.prosrc; definition:=f.def;
  IF strpos(source,'-- CPL_PERSONAL_ONLY_V1')>0 THEN RAISE EXCEPTION 'RPC_ALREADY_GUARDED:%',f.proname; END IF;
  IF f.lanname='plpgsql' THEN
   rewritten:=regexp_replace(source,'\mBEGIN\M',E'BEGIN\n -- CPL_PERSONAL_ONLY_V1\n PERFORM cpl_private.require_cpl_owner();','i');
   IF rewritten=source THEN RAISE EXCEPTION 'UNSUPPORTED_RPC_BODY:%',f.proname; END IF;
  ELSIF f.lanname='sql' AND f.proname='maintenance_ping' THEN
   definition:=replace(definition,'LANGUAGE sql','LANGUAGE plpgsql');
   rewritten:=E'\nBEGIN\n -- CPL_PERSONAL_ONLY_V1\n PERFORM cpl_private.require_cpl_owner();\n RETURN 1;\nEND;\n';
  ELSIF f.lanname='sql' AND f.proname IN ('research_suitability_distribution','research_condition_summary','research_condition_distribution') THEN
   definition:=replace(definition,'LANGUAGE sql','LANGUAGE plpgsql');
   rewritten:=E'\n#variable_conflict use_column\nBEGIN\n -- CPL_PERSONAL_ONLY_V1\n PERFORM public.cpl_is_owner();\n IF NOT public.cpl_is_owner() THEN RAISE EXCEPTION USING ERRCODE=''42501'', MESSAGE=''CPL_OWNER_REQUIRED''; END IF;\n RETURN QUERY\n'
    || regexp_replace(btrim(source),';\s*$','') || E';\nEND;\n';
  ELSE RAISE EXCEPTION 'UNSUPPORTED_RPC_LANGUAGE:%',f.proname; END IF;
  IF strpos(definition,'$function$'||source||'$function$')=0 THEN
   RAISE EXCEPTION 'UNSUPPORTED_RPC_DELIMITER:%',f.proname;
  END IF;
  EXECUTE replace(definition,'$function$'||source||'$function$','$function$'||rewritten||'$function$');
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',f.proname,f.args);
 END LOOP;
END;
$migration$;

-- Also gate the private race creator, in case an existing/future owner RPC calls it.
DO $migration$
DECLARE f record; rewritten text;
BEGIN
 SELECT p.prosrc AS source,pg_get_functiondef(p.oid) AS def INTO STRICT f
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='cpl_private' AND p.proname='ensure_research_race';
 rewritten:=regexp_replace(f.source,'\mBEGIN\M',E'BEGIN\n -- CPL_PERSONAL_ONLY_V1\n PERFORM cpl_private.require_cpl_owner();','i');
 IF rewritten=f.source THEN RAISE EXCEPTION 'UNSUPPORTED_PRIVATE_RPC_BODY'; END IF;
 EXECUTE replace(f.def,'$function$'||f.source||'$function$','$function$'||rewritten||'$function$');
END;
$migration$;
