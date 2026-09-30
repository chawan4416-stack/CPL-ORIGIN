# CPL Phase 1: client TRUNCATE privileges
Date: 2026-09-30 JST.
Scope: C1 and C2 only. No UI, master data, RPC, RLS, OAuth, Pages settings, or DEV-only 0027 changes.

## Applied
- C1: revoked TRUNCATE from anon/authenticated on course_research, master_options, races, race_results, and from authenticated on research_hypotheses.
- C2, postgres creator only: revoked TRUNCATE defaults for anon/authenticated on future public tables.
- Both reviewed SQL files were applied individually to both projects; no bulk migration push was used.
- service_role/owner management rights and every non-TRUNCATE ACL entry were preserved.
- Authenticated database-role save/read tests passed. All temporary test writes were rolled back.
- RLS policies, RPC definitions/ACLs and all 11 public table data fingerprints stayed unchanged.

## Pending
C2 is NOT fully complete. supabase_admin's public TABLE defaults still grant TRUNCATE to anon and authenticated in both projects.
The current postgres connection is not a member of supabase_admin, cannot SET ROLE to it and is not a superuser.
No role escalation, protected catalog editing, or attempt to change those defaults was performed.
An appropriately authorized administrative path is required for the remaining creator defaults.
Other schemas and non-TRUNCATE default privileges were not changed.

## Migration mapping
CLI-generated source filenames and project-assigned migration versions are recorded separately.
Match by migration name AND exact SQL contents, not merely the timestamp.
Do not bulk-push these migration files or repair existing histories automatically.

| Source file | Name | Formal DB version | DEV DB version |
|---|---|---|---|
| 20260930143238_cpl_truncate_existing_client_privileges.sql | cpl_truncate_existing_client_privileges | 20260930143633 | 20260930143606 |
| 20260930143251_cpl_truncate_postgres_default_privileges.sql | cpl_truncate_postgres_default_privileges | 20260930143711 | 20260930143650 |

The database statements match the source SQL exactly in both projects.
All pre-existing migrations, including DEV-only 0027, were left intact.
This maintenance branch records applied database changes; formal/DEV web branch heads were not moved to avoid triggering deployment.

## Rollback
The adjacent rollback SQL restores only the nine C1 ACL entries and two postgres C2 default entries changed per project.
It does not alter data, RLS, RPC, other privileges or supabase_admin defaults.
Rollback reintroduces the former excessive client TRUNCATE permissions; execute it only for an approved recovery.
Do not delete or rewrite migration history entries during rollback.

## Evidence
Pre-change ACL/default ACL/has_table_privilege snapshots and rollback SQL were saved before applying migrations.
Post-change snapshots, row counts/content fingerprints, exact migration statements and test scripts are in the Phase 1 evidence archive.
The test is at the database authenticated-role level; Google OAuth and an iPhone session were not exercised.
