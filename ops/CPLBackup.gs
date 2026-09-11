/**
 * CPL backup runner for Google Apps Script.
 *
 * Runs as the user's Google account, so backups are written directly to
 * the user's Google Drive without storing a Google refresh token in GitHub.
 *
 * Script Properties required:
 *   SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *
 * The secret key is server-side only. Never put it in the web app or GitHub Pages.
 */

const BACKUP_FOLDER_NAME = 'CPL_BACKUP';
const KEEP_GENERATIONS = 12;
const PAGE_SIZE = 1000;

function runCplBackup() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty('SUPABASE_URL');
  const secretKey = props.getProperty('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !secretKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY が Script Properties にありません。');
  }

  const races = fetchAllRows_(supabaseUrl, secretKey, 'races', 'id,race_date,racecourse,race_number,course,surface,distance,track_condition,field_size,created_by,created_at,updated_at');
  const raceResults = fetchAllRows_(supabaseUrl, secretKey, 'race_results', 'id,race_id,finish_position,popularity,win_odds,chest,hindquarter,gait,balance,tone,abdomen,created_at');

  const backup = {
    backup_version: 1,
    created_at: new Date().toISOString(),
    source: 'CPL Supabase PostgreSQL',
    races: races,
    race_results: raceResults
  };

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyyMMdd_HHmm');
  const fileName = 'CPL_BACKUP_' + timestamp + '.json';
  const folder = getOrCreateBackupFolder_();
  folder.createFile(fileName, JSON.stringify(backup, null, 2), MimeType.PLAIN_TEXT);

  pruneOldBackups_(folder);
}

function fetchAllRows_(baseUrl, secretKey, table, select) {
  const rows = [];
  let offset = 0;

  while (true) {
    const url = baseUrl + '/rest/v1/' + table
      + '?select=' + encodeURIComponent(select)
      + '&order=id.asc'
      + '&offset=' + offset
      + '&limit=' + PAGE_SIZE;

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        apikey: secretKey,
        Authorization: 'Bearer ' + secretKey
      }
    });

    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error(table + ' backup fetch failed: HTTP ' + code + ' ' + response.getContentText());
    }

    const page = JSON.parse(response.getContentText());
    rows.push.apply(rows, page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function getOrCreateBackupFolder_() {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

function pruneOldBackups_(folder) {
  const files = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (/^CPL_BACKUP_\d{8}_\d{4}\.json$/.test(file.getName())) {
      files.push(file);
    }
  }

  files.sort(function(a, b) {
    return b.getName().localeCompare(a.getName());
  });

  for (let i = KEEP_GENERATIONS; i < files.length; i++) {
    files[i].setTrashed(true);
  }
}

/** Run once after setup. Creates a weekly trigger on Monday around 12:15 JST. */
function installCplBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runCplBackup') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('runCplBackup')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(12)
    .create();
}
