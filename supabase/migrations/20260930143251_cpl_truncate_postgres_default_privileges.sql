-- CPL Phase 1 C2: postgres-created public tables only.
-- supabase_admin-created defaults cannot be changed by the current postgres connection.
-- Their remaining TRUNCATE entries are explicitly pending; this is not full C2 completion.
-- service_role, owner privileges, all non-TRUNCATE defaults and other schemas stay intact.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon, authenticated;

DO $verify$
BEGIN
  IF EXISTS(
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='r'
      AND (d.defaclnamespace=0 OR d.defaclnamespace='public'::regnamespace)
      AND a.grantee IN ('anon'::regrole,'authenticated'::regrole)
      AND a.privilege_type='TRUNCATE'
  ) THEN
    RAISE EXCEPTION 'Remaining client TRUNCATE default for postgres-created public tables';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='r'
      AND d.defaclnamespace='public'::regnamespace
      AND a.grantee='service_role'::regrole AND a.privilege_type='TRUNCATE'
  ) THEN
    RAISE EXCEPTION 'service_role management default was not preserved';
  END IF;
END
$verify$;
