/**
 * CPL spreadsheet setup.
 * Run setupCpl() once from Apps Script.
 * Safe to run again: existing DB rows are preserved.
 */
function setupCpl() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートが取得できません。');

  const headers = getDbSchema();
  let db = ss.getSheetByName(CPL_CONFIG.DB_SHEET);
  if (!db) {
    db = ss.insertSheet(CPL_CONFIG.DB_SHEET);
    db.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const lastColumn = db.getLastColumn();
    if (db.getLastRow() === 0 || lastColumn === 0) {
      db.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const currentHeaders = db.getRange(1, 1, 1, lastColumn).getValues()[0];
      const sameSchema = currentHeaders.length === headers.length &&
        headers.every((header, index) => currentHeaders[index] === header);
      if (!sameSchema) {
        throw new Error('DBシートの列構成がCPL Ver1.0と一致しません。既存データを保護するためセットアップを停止しました。');
      }
    }
  }

  db.setFrozenRows(1);
  db.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  db.getRange(2, 1, Math.max(db.getMaxRows() - 1, 1), 1).setNumberFormat('yyyy-mm-dd');
  db.getRange(2, 10, Math.max(db.getMaxRows() - 1, 1), 1).setNumberFormat('0.0');
  db.getRange(2, 18, Math.max(db.getMaxRows() - 1, 1), 1).setNumberFormat('0.0');
  db.getRange(2, 26, Math.max(db.getMaxRows() - 1, 1), 1).setNumberFormat('0.0');

  let home = ss.getSheetByName(CPL_CONFIG.START_SHEET);
  if (!home) home = ss.insertSheet(CPL_CONFIG.START_SHEET, 0);
  home.getRange('A1').setValue('CPL');
  home.getRange('A2').setValue(CPL_CONFIG.VERSION);
  home.getRange('A4').setValue('Webアプリからレース結果を登録してください。');

  return { ok: true, spreadsheetId: ss.getId() };
}
