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
- Track condition

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
- Abdomen
- Paddock evaluation

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

## 6. Operations

- [x] Daily `maintenance_ping()` workflow
- [x] Google Drive backup
- [x] Backup includes paddock evaluation
- [x] Backup generation retention: latest 12

## 7. Release Gate

The remaining item is the smartphone real-device acceptance test.

Required flow:

1. Google login
2. Open HOME
3. Enter one race
4. Enter 1st–3rd
5. Save
6. Confirm registered data
7. Save the same race again and confirm overwrite
8. Confirm updated data
9. Delete the race
10. Confirm it disappears

After this test passes, Ver1.0 is ready to become the operational baseline for CPL data collection.
