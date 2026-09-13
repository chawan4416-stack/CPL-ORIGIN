# CPL Ver1.0 Completion Checklist

## Scope
- Race-result data collection only.
- No horse names.
- No pre-race prediction or evaluation input.
- Popularity and win odds are stored as result-entry market data.
- One race is saved once after 1st–3rd are complete.

## Race fields
- Date
- Racecourse
- Race number
- Course
- Surface
- Distance
- Track condition
- Field size

## Top 3 fields
- Popularity
- Win odds
- Chest
- Hindquarter
- Gait
- Front/rear balance
- Tone
- Abdomen
- Paddock evaluation

## Ver1.0 provisional body master
- Chest: シャープ / 普通 / 厚 / 重厚
- Hindquarter: シャープ / 普通 / 厚 / 重厚
- Gait: チャカ付き / 歩幅短い / 歩幅長い / 普通 / スムーズ
- Balance: 良い / 普通 / 悪い
- Tone: パンパン / 普通 / ゴム感
- Abdomen: 普通 / 太い
- Paddock evaluation: 悪い / 普通 / 良い

## Architecture
- Frontend: smartphone-first Web App
- Hosting: GitHub Pages
- Authentication: Supabase Auth + Google login
- Database: Supabase PostgreSQL
- Master data: `master_options`
- Race data: `races`
- Result data: `race_results`
- Authoritative save path: `save_race()` RPC
- Race deletion: `delete_race()` RPC
- Row-level security (RLS) protects user data

## Completion gate
1. Supabase database structure and integrity rules are complete.
2. Web app loads master data from `master_options`.
3. Required input is validated before save.
4. One submit call saves exactly one race and its 1st–3rd results.
5. Duplicate race input is prevented and overwrite is supported.
6. Success screen only confirms save and provides the next action.
7. Registered data can be viewed and the user's own race can be deleted.
8. Master screen is reference-only.
9. Research analysis remains outside Ver1.0.
10. Daily database maintenance is configured and manually verified.
11. Google Drive backup is configured and manually verified.
12. Real-device acceptance test remains as the final release gate.
