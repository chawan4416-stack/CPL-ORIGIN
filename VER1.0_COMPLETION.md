# CPL Ver1.0 Completion Checklist

## 1. Product Scope

- [x] Post-race data collection only
- [x] No horse names
- [x] No pre-race prediction/evaluation
- [x] Top 3 only
- [x] One race = one save
- [x] Research/analysis deferred to Ver1.1+

## 2. Input Data

### Race

- Race date
- Racecourse
- Race number
- Surface
- Distance
- Course layout
- Race class
- Track condition
- Field size

### Results

For 1st–3rd:

- Finish position
- Popularity
- Win odds
- Chest
- Hindquarter
- Gait
- Balance
- Tone
- Agitation（blank = no issue, or `あり` / `強`）
- Sweating（blank = no issue, or `あり` / `強`）
- Paddock evaluation

Abdomen is not part of the Ver1.0 production schema.

## 3. Current Architecture

- [x] Smartphone-first Web App
- [x] GitHub Pages
- [x] Supabase Auth + Google OAuth
- [x] Supabase PostgreSQL
- [x] RLS
- [x] `master_options`
- [x] `races`
- [x] `race_results`
- [x] `save_race()`
- [x] `delete_race()`

## 4. Database Integrity

- [x] DB-side input validation
- [x] Master-value validation
- [x] Top-3 position validation
- [x] Popularity uniqueness validation
- [x] Duplicate race prevention
- [x] Overwrite save
- [x] `updated_at` maintenance
- [ ] Migration 0014 applied to production
- [ ] Optional agitation/sweating NULL behavior confirmed

## 5. UI / UX

- [x] HOME
- [x] Today's research entry point
- [x] Race input flow
- [x] 1st → 2nd → 3rd sequential input
- [x] Save completion state
- [x] Registered data display
- [x] Own-data deletion
- [x] Master reference display
- [x] Research Room disabled until later version
- [x] Draft compatibility retained across the paddock field change

## 6. Operations

- [x] Daily `maintenance_ping()` workflow
- [x] Google Drive backup source updated to backup version 4
- [x] Backup generation retention: latest 12
- [ ] Deployed Apps Script backup updated and tested after migration 0014

## 7. Release Gate

Required remaining flow:

1. Apply migration `0014_paddock_condition_fields.sql`
2. Confirm Master shows AGITATION / SWEATING and no ABDOMEN
3. Enter one race with agitation/sweating blank and save
4. Confirm NULL is stored for both optional fields
5. Overwrite the same race using `あり` / `強`
6. Confirm updated values
7. Confirm app-switch draft continuity still works
8. Confirm registered data
9. Delete the race
10. Update and run the deployed Google Apps Script backup

After this test passes, Ver1.0 is ready to become the operational baseline for CPL data collection.
