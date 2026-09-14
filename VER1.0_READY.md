# CPL Ver1.0 Ready

## Current Architecture

- Smartphone-first Web App
- GitHub Pages hosting
- Supabase Auth + Google OAuth
- Supabase PostgreSQL
- RLS enabled
- `master_options` as master data
- `races` + `race_results` as application data
- `save_race()` as authoritative save operation
- `delete_race()` for user-owned race deletion
- GitHub Actions daily maintenance
- Google Drive backup via `ops/CPLBackup.gs`

## Ver1.0 Scope

Ver1.0 is a post-race data collection system.

- No horse names
- No pre-race predictions/evaluations
- Top 3 only
- One race = one save
- Popularity and win odds are stored as objective race-result data
- Eight paddock evaluation fields are stored
- Agitation and sweating are optional condition fields; blank means no issue
- Research/analysis is deferred to Ver1.1+

## Release Gate

The following must all be confirmed:

- [ ] Google login
- [ ] HOME
- [ ] Race input
- [ ] 1st–3rd input
- [ ] Paddock evaluation input
- [ ] Optional agitation/sweating blank-state save
- [ ] Save
- [ ] Duplicate/overwrite
- [ ] Registered data display
- [ ] Own-data deletion
- [ ] Master display
- [ ] Daily maintenance
- [ ] Google Drive backup
- [ ] Smartphone real-device acceptance test

## Current Status

PC-side implementation and operational setup are prepared, but migration `0014_paddock_condition_fields.sql` and the corresponding real-device save flow must be confirmed before this revision is treated as complete.

The remaining release gate should cover the complete flow from login through save, overwrite, registered-data confirmation, deletion, and the optional agitation/sweating behavior.

After that confirmation, Ver1.0 can be treated as the operational baseline for data collection.
