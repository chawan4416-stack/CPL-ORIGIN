/**
 * CPL database operations.
 * Processing only. Master data is not read from the DB sheet.
 */
function saveRace(record) {
  validateRecord(record);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートが取得できません。');

  const sheet = ss.getSheetByName(CPL_CONFIG.DB_SHEET);
  if (!sheet) throw new Error('DBシートがありません。setupCpl()を先に実行してください。');

  const row = getDbSchema().map(key => record[key] ?? '');
  sheet.appendRow(row);
  return { ok: true };
}

function getRaceCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return 0;

  const sheet = ss.getSheetByName(CPL_CONFIG.DB_SHEET);
  if (!sheet) return 0;

  return Math.max(0, sheet.getLastRow() - 1);
}

function validateRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('入力データを取得できません。');
  }

  const requiredRace = [
    'DATE', 'RACECOURSE', 'RACE_NUMBER', 'COURSE',
    'SURFACE', 'DISTANCE', 'TRACK_CONDITION', 'FIELD_SIZE'
  ];
  requiredRace.forEach(key => requireValue(record[key], 'レース情報'));

  requirePositiveNumber(record.RACE_NUMBER, 'レース番号');
  requirePositiveNumber(record.DISTANCE, '距離');
  requirePositiveNumber(record.FIELD_SIZE, '頭数');

  [1, 2, 3].forEach(rank => {
    const prefix = rank === 1 ? 'FIRST' : rank === 2 ? 'SECOND' : 'THIRD';
    ['POPULARITY', 'ODDS', 'CHEST', 'HINDQUARTER', 'GAIT', 'BALANCE', 'TONE', 'ABDOMEN']
      .forEach(key => requireValue(record[prefix + '_' + key], rank + '着'));

    requirePositiveNumber(record[prefix + '_POPULARITY'], rank + '着の人気');
    requireNonNegativeNumber(record[prefix + '_ODDS'], rank + '着の単勝オッズ');
  });
}

function requireValue(value, section) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(section + 'に未入力があります。');
  }
}

function requirePositiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(label + 'を正しく入力してください。');
  }
}

function requireNonNegativeNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(label + 'を正しく入力してください。');
  }
}
