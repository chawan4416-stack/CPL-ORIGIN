/**
 * CPL backup version 6. Development candidate; do not install the trigger on
 * production until 0022, a restore rehearsal, and rollout are approved.
 * Kept separate from the existing version 5 Apps Script schedule and files.
 * Script Properties: SUPABASE_URL, SUPABASE_SECRET_KEY (server-side only).
 */
const CPL_V6_FOLDER = 'CPL_BACKUP';
const CPL_V6_KEEP = 12;
const CPL_V6_PAGE_SIZE = 1000;
const CPL_V6_TABLES = [
  {name:'races', order:'id.asc', columns:'id,race_date,racecourse,race_number,course,surface,distance,race_class,track_condition,field_size,created_by,created_at,updated_at'},
  {name:'race_results', order:'id.asc', columns:'id,race_id,finish_position,popularity,win_odds,chest,hindquarter,gait,balance,tone,agitation,sweating,fast_walking,paddock_evaluation,created_at'},
  {name:'race_evaluations', order:'race_id.asc', columns:'race_id,status,current_revision_no,initial_confirmed_at,result_review_started_at,results_recorded_at,result_status,created_at,updated_at'},
  {name:'race_evaluation_revisions', order:'race_id.asc,revision_no.asc', columns:'race_id,revision_no,revision_kind,knowledge_state,no_suitable_horse,no_focus_horse,correction_note,created_at'},
  {name:'race_runner_evaluations', order:'race_id.asc,revision_no.asc,horse_number.asc', columns:'race_id,revision_no,horse_number,entry_status,chest,hindquarter,gait,balance,tone,flank_tuck,agitation,sweating,fast_walking,is_suitable,is_focus'},
  {name:'race_runner_outcomes', order:'race_id.asc,horse_number.asc', columns:'race_id,horse_number,outcome_status,popularity,finish_position,created_at,updated_at'}
];

function runCplBackupV6() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('SUPABASE_URL');
  const secret = props.getProperty('SUPABASE_SECRET_KEY');
  if (!url || !secret) throw new Error('開発環境のURLとsecret keyをScript Propertiesに設定してください。');
  const backup = { backup_version:6, created_at:new Date().toISOString(),
    source:'CPL Supabase PostgreSQL', source_project_ref:projectRefV6_(url) };
  CPL_V6_TABLES.forEach(spec => { backup[spec.name] = fetchRowsV6_(url,secret,spec); });
  validateBackupV6_(backup);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo','yyyyMMdd_HHmmss');
  const folder = getBackupFolderV6_();
  const filename = 'CPL_BACKUP_V6_' + stamp + '.json';
  folder.createFile(filename,JSON.stringify(backup,null,2),MimeType.PLAIN_TEXT);
  pruneBackupsV6_(folder);
  return {filename:filename, counts:Object.fromEntries(CPL_V6_TABLES.map(spec => [spec.name,backup[spec.name].length]))};
}

function projectRefV6_(url) {
  const match = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i.exec(url.replace(/\/$/,''));
  if (!match) throw new Error('Supabaseのproject URL形式を確認してください。');
  return match[1];
}

function fetchRowsV6_(base,secret,spec) {
  const rows=[];
  for (let offset=0;;offset+=CPL_V6_PAGE_SIZE) {
    const url=base.replace(/\/$/,'')+'/rest/v1/'+spec.name+
      '?select='+encodeURIComponent(spec.columns)+'&order='+encodeURIComponent(spec.order)+
      '&offset='+offset+'&limit='+CPL_V6_PAGE_SIZE;
    const response=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,headers:{
      apikey:secret,Authorization:'Bearer '+secret
    }});
    if (response.getResponseCode()<200 || response.getResponseCode()>=300)
      throw new Error(spec.name+' backup fetch failed: HTTP '+response.getResponseCode());
    const page=JSON.parse(response.getContentText());
    if (!Array.isArray(page)) throw new Error(spec.name+' returned a non-array response');
    rows.push.apply(rows,page);
    if (page.length<CPL_V6_PAGE_SIZE) return rows;
  }
}

function validateBackupV6_(b) {
  if (b.backup_version!==6) throw new Error('Wrong backup version');
  const raceById=new Map(b.races.map(r => [r.id,r]));
  const evalById=new Map(b.race_evaluations.map(e => [e.race_id,e]));
  const revisions=new Set(b.race_evaluation_revisions.map(r => r.race_id+':'+r.revision_no));
  const runners=new Map();
  const outcomes=new Map();
  b.race_runner_evaluations.forEach(r => {
    const key=r.race_id+':'+r.revision_no;
    runners.set(key,(runners.get(key)||0)+1);
  });
  b.race_runner_outcomes.forEach(o => outcomes.set(o.race_id,(outcomes.get(o.race_id)||0)+1));
  if (raceById.size!==b.races.length || evalById.size!==b.race_evaluations.length ||
      revisions.size!==b.race_evaluation_revisions.length) throw new Error('Duplicate primary key in backup');
  b.race_results.forEach(r => { if (!raceById.has(r.race_id)) throw new Error('Orphaned legacy result'); });
  b.race_evaluations.forEach(e => {
    const race=raceById.get(e.race_id);
    if (!race || !revisions.has(e.race_id+':1') ||
        !revisions.has(e.race_id+':'+e.current_revision_no)) throw new Error('Missing race or revision');
    if (e.result_status==='void' && (outcomes.get(e.race_id)||0)!==0)
      throw new Error('Void race cannot have outcome rows');
    if (e.result_status==='official' && (outcomes.get(e.race_id)||0)!==race.field_size)
      throw new Error('Incomplete official outcomes');
  });
  b.race_evaluation_revisions.forEach(r => {
    const race=raceById.get(r.race_id);
    if (!evalById.has(r.race_id) || !race || runners.get(r.race_id+':'+r.revision_no)!==race.field_size)
      throw new Error('Incomplete full evaluation snapshot');
  });
  b.race_runner_evaluations.forEach(r => {
    if (!revisions.has(r.race_id+':'+r.revision_no)) throw new Error('Orphaned runner evaluation');
  });
  b.race_runner_outcomes.forEach(o => {
    if (!evalById.has(o.race_id)) throw new Error('Orphaned runner outcome');
  });
}

function getBackupFolderV6_() {
  const folders=DriveApp.getFoldersByName(CPL_V6_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CPL_V6_FOLDER);
}
function pruneBackupsV6_(folder) {
  const files=[],iterator=folder.getFiles();
  while (iterator.hasNext()) {
    const file=iterator.next();
    if (/^CPL_BACKUP_V6_\d{8}_\d{6}\.json$/.test(file.getName())) files.push(file);
  }
  files.sort((a,b) => b.getName().localeCompare(a.getName()));
  for (let i=CPL_V6_KEEP;i<files.length;i++) files[i].setTrashed(true);
}
