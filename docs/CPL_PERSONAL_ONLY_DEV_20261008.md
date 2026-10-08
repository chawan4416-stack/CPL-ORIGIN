# CPL personal-only access: DEV implementation

2026-10-08. Implemented in CPL-DEV only (`kczisspagwqzdvaeemir`). Production
`ekgislctkribtztazvsd` remains unchanged; production rollout needs explicit approval.

## Identity and ownership

Each project currently has one Google Auth user. All existing races belong to that
project's one user: production 8, DEV 2. Child research ownership follows the race FK.
The actual UUIDs were checked against Auth and existing race ownership before DEV
configuration. No email comparison, user_metadata authorization, or client-supplied
created_by is used. Production and DEV UUIDs are different.

An administrator configures one row in `cpl_private.app_owner`, containing user_id,
environment, project_ref and configured_at. The actual environment-specific UUID
configuration is deliberately not in Git. No app role can read or modify this table.
An empty configuration denies all app users. The singleton key prevents multiple
owners. The UUID references auth.users; account deletion cannot silently remove this
configuration. Account deletion or ownership transfer requires a separate administrative
process and backup, not an app endpoint.

course_research and research_hypotheses have no row owner field. No historical owner
was guessed or backfilled. Their existing rows are unchanged; access is restricted to
the single configured app user. This implements personal use without inventing shared
ownership or rewriting historical data.

## Access controls

- New RESTRICTIVE policies on all 11 public business tables AND with original policies.
- Existing created_by / parent-race ownership checks remain in force.
- anon table privileges and authenticated TRUNCATE are revoked for those 11 tables.
- Every current business save/delete/review/summary RPC checks the owner UUID before
  validation, data access or modification. Existing argument signatures and logic remain.
- Optional DEV condition distribution is guarded when present; it is not created in
  production by this migration.
- SECURITY DEFINER RPCs call a private guard before their original body. The private
  race creator also checks the gate. SQL summaries retain invoker rights and their original
  query, wrapped in a guarded PL/pgSQL body with column name conflict handling.
- maintenance_ping is also owner-only; anon cannot execute any business RPC.
- cpl_is_owner exposes only a boolean to authenticated clients, no UUID or config rows.
- No Google provider / Site URL / Redirect URL / storageKey / session handling change.
- Auth may still issue a session to another Google user; that session grants no research
  access. This is database authorization, not a change to Google account admission.
- Administrative/database-owner and backup BYPASSRLS access remains privileged.
  Client exclusivity does not mean administrators or leaked privileged keys are harmless.

## Migration files and DEV ledger

1. `20261008063147_cpl_personal_only.sql` (DEV ledger 20261008063418).
2. `20261008073541_cpl_owner_guard_client_access.sql` (DEV ledger 20261008073341).

CLI-generated source timestamps and MCP-generated apply timestamps differ. Apply order
and migration names are recorded above. No previously existing migration was rewritten.
DEV's confirmed owner row was configured administratively in the same transaction as
the first migration. Generic migration files themselves contain no configured UUID.

The migration guards live function definitions rather than copying DEV application
code to production. It fails on missing required functions or unsupported language/body
format. Production must still be reviewed against its live definitions before approval.

## Verification

`tests/cpl-personal-only.sql` is DEV-only and rolls back all row fixtures. The outsider is
a dedicated simulated DB JWT subject, not an actual created Google Auth account.

Passed:

- Owner can read masters (470), course research (2), hypotheses (2), and 9-row summary.
- Owner can save and restore three new-axis suitability observations and state research.
- A payload's forged created_by does not change actual race ownership.
- Owner can delete the dedicated fixture race with its children.
- Outsider reads return zero for all 11 business tables, including outsider's own prospective
  data: access is configured-owner-only, not just per-user isolation.
- Outsider is rejected by 12 business RPCs, including all save/delete/review/summary RPCs.
- Outsider hypothesis/course updates and deletes affect zero rows; hypothesis insert is denied.
- Outsider cannot access the private configuration.
- anon cannot read the 11 tables or execute the business RPCs / owner helper.
- Empty owner configuration denies even the previously allowed owner.
- Existing business row counts and full-row fingerprints match the pre-test state.
- Production function definitions, policies, table ACLs/RLS and business rows are unchanged.

DB transaction rollback does not roll back sequence allocation. Reusable test inserts use
explicit fixture identity values to avoid unnecessary sequence advancement. Row equality
checks are not a claim that all database runtime counters are unchanged.

Security Advisor: no anon SECURITY DEFINER executable warning remains. authenticated
SECURITY DEFINER notices remain for necessary guarded functions and the boolean helper.
Leaked-password-protection warning is unchanged; Auth settings are outside this change.
Reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Actual Google login with a second account, iPhone workflow and fresh-token REST tests
have NOT been executed. The user should confirm normal DEV Google login, existing
records, input/save/summary after this DB change. No browser credentials were requested.

## Data preservation and backup

Before DDL, the DEV business data and pre-change security definitions/policies/ACLs were
saved as a private logical snapshot with SHA-256 manifest and ZIP integrity validation.
This is not native pg_dump or a fully tested restore package.

DEV retained: races 2, suitability 6, master 470, course 2, hypotheses 2; condition and
legacy/full-runner research tables are 0. Production retained: races 8, suitability 0,
condition 0, master 470, course 2, hypotheses 2. Neither environment's business rows
were deleted or converted.

The previous complete-backup requirements remain: all 11 business tables, schema,
RLS/policy/GRANT/function/trigger/index/sequence, Auth references, checksums, retention,
failure detection and isolated restore testing. Those backup automation changes are not
implemented by this security migration. The new private app_owner table and configuration
must also be recoverable, with target-environment UUID/ref explicitly confirmed before
enabling access. Do not copy a production configuration blindly into DEV or vice versa.

## Publication and production boundary

These changes are database-only. No web application file or asset is changed, so the
existing DEV Site version 89 and its public UI remain the same; no new Site deployment
is necessary. Migration/test documentation is stored on the separate
`cpl-personal-only-dev` GitHub branch. It must not be merged into supabase-v1 without
production approval. The Pages workflow only deploys supabase-v1 pushes; it was not run.

Before production rollout: approved private backup of live schema/data; recheck actual
Auth UUID / every race owner; inspect current RPC definitions; apply the two migrations
and explicit confirmed production owner configuration atomically; rerun authorization
and owner regression tests without changing production research rows; verify Google
login and user workflow. Stop on unknown owners or configuration mismatches.

Existing Ver1.0 baseline and completion/restore records are untouched. No backup
deletion, legacy data ownership conversion, UI redesign or unrelated feature change.
