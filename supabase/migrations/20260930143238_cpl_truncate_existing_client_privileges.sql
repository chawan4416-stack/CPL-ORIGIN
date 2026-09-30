-- CPL Phase 1 C1. Identical reviewed SQL is applied to formal and DEV.
-- Only client-role TRUNCATE grants are removed. No data, RLS, RPC, or other privileges change.
-- This migration is independent of DEV-only 0027.
REVOKE TRUNCATE ON TABLE public.course_research, public.master_options,
  public.races, public.race_results FROM anon, authenticated;
REVOKE TRUNCATE ON TABLE public.research_hypotheses FROM authenticated;

DO $verify$
DECLARE v_table text; v_role text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['course_research','master_options','races','race_results'] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(v_role,format('public.%I',v_table),'TRUNCATE') THEN
        RAISE EXCEPTION 'Unexpected remaining TRUNCATE privilege: % / %',v_table,v_role;
      END IF;
    END LOOP;
  END LOOP;
  IF has_table_privilege('authenticated','public.research_hypotheses','TRUNCATE') THEN
    RAISE EXCEPTION 'Unexpected remaining TRUNCATE privilege: research_hypotheses / authenticated';
  END IF;
  FOREACH v_table IN ARRAY ARRAY['course_research','master_options','races','race_results','research_hypotheses'] LOOP
    FOREACH v_role IN ARRAY ARRAY['postgres','service_role'] LOOP
      IF NOT has_table_privilege(v_role,format('public.%I',v_table),'TRUNCATE') THEN
        RAISE EXCEPTION 'Management TRUNCATE privilege missing: % / %',v_table,v_role;
      END IF;
    END LOOP;
  END LOOP;
END
$verify$;
