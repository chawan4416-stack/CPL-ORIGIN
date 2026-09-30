-- CPL Phase 1 rollback: only the TRUNCATE ACL entries changed by C1 / C2-postgres.
-- Apply only if an approved rollback is necessary. This restores the former excess privileges.
GRANT TRUNCATE ON TABLE public.course_research, public.master_options,
  public.races, public.race_results TO anon, authenticated;
GRANT TRUNCATE ON TABLE public.research_hypotheses TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT TRUNCATE ON TABLES TO anon, authenticated;
