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

## Ver1.0 provisional body master
- Chest: シャープ / 普通 / 厚 / 重厚
- Hindquarter: シャープ / 普通 / 厚 / 重厚
- Gait: チャカ付き / 歩幅短い / 歩幅長い / 普通 / スムーズ
- Balance: 良い / 普通 / 悪い
- Tone: パンパン / 普通 / ゴム感
- Abdomen: 普通 / 太い

## Completion gate
1. Spreadsheet setup is safe to rerun and does not erase saved races.
2. Web app loads master data from MASTER_DATA.
3. Required input is validated before save.
4. One submit call saves exactly one DB row.
5. Success screen only confirms save and provides next action.
6. Master screen is reference-only.
7. Research analysis remains outside Ver1.0.
