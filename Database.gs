/**
 * CPL database operations.
 * Processing only. Master data is not read from the DB sheet.
 */
function saveRace(record) {
  validateRecord(record);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CPL_CONFIG.DB_SHEET);
  if (!sheet) throw new Error('DBシートがありません。setupCpl()を先に実行してください。');

  const row = getDbSchema().map(key => record[key] ?? '');
  sheet.appendRow(row);
  return { ok: true };
}

function getRaceCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CPL_CONFIG.DB_SHEET);
  if (!sheet) return 0;
  return Math.max(0, sheet.getLastRow() - 1);
}

function validateRecord(record) {
  const required = [
    'DATE','RACECOURSE','RACE_NUMBER','SURFACE','DISTANCE','TRACK_CONDITION','FIELD_SIZE'
  ];
  required.forEach(key => {
    if (record[key] === undefined || record[key] === '') throw new Error('未入力があります。');
  });

  [1,2,3].forEach(rank => {
    const prefix = rank === 1 ? 'FIRST' : rank === 2 ? 'SECOND' : 'THIRD';
    ['POPULARITY','ODDS','CHEST','HINDQUARTER','GAIT','BALANCE','TONE','ABDOMEN'].forEach(key => {
      if (record[prefix + '_' + key] === undefined || record[prefix + '_' + key] === '') {
        throw new Error(rank + '着の未入力があります。');
      }
    });
  });
}
