/**
 * CPL Ver1.0 input layout.
 * Layout is deliberately simple: race information followed by 1st–3rd cards.
 */
const INPUT_LAYOUT = Object.freeze({
  RACE: Object.freeze({
    START_ROW: 8,
    TITLE: 'レース情報'
  }),
  HORSE: Object.freeze({
    FIRST: Object.freeze({ TITLE: '1着', START_ROW: 20 }),
    SECOND: Object.freeze({ TITLE: '2着', START_ROW: 32 }),
    THIRD: Object.freeze({ TITLE: '3着', START_ROW: 44 })
  }),
  COLUMN: Object.freeze({ START: 2 }),
  FIELDS: Object.freeze({
    POPULARITY: Object.freeze({ LABEL: '人気', ROW: 0, COL: 0 }),
    ODDS: Object.freeze({ LABEL: '単勝オッズ', ROW: 0, COL: 1 }),
    CHEST: Object.freeze({ LABEL: '胸前', ROW: 0, COL: 2 }),
    HINDQUARTER: Object.freeze({ LABEL: 'トモ', ROW: 0, COL: 4 }),
    GAIT: Object.freeze({ LABEL: '歩様', ROW: 2, COL: 0 }),
    BALANCE: Object.freeze({ LABEL: '前後バランス', ROW: 2, COL: 2 }),
    TONE: Object.freeze({ LABEL: 'ハリ', ROW: 2, COL: 4 }),
    ABDOMEN: Object.freeze({ LABEL: '腹回り', ROW: 2, COL: 6 })
  })
});
