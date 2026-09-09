/**
 * CPL spreadsheet setup.
 * Run setupCpl() once from Apps Script.
 */
function setupCpl() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートが取得できません。');

  let db = ss.getSheetByName(CPL_CONFIG.DB_SHEET);
  if (!db) db = ss.insertSheet(CPL_CONFIG.DB_SHEET);

  const headers = getDbSchema();
  db.clear();
  db.getRange(1, 1, 1, headers.length).setValues([headers]);
  db.setFrozenRows(1);
  db.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  let home = ss.getSheetByName(CPL_CONFIG.START_SHEET);
  if (!home) home = ss.insertSheet(CPL_CONFIG.START_SHEET, 0);
  home.clear();
  home.getRange('A1').setValue('CPL');
  home.getRange('A2').setValue(CPL_CONFIG.VERSION);
  home.getRange('A4').setValue('Webアプリからレース結果を登録してください。');

  return { ok: true, spreadsheetId: ss.getId() };
}
