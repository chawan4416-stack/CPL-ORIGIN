/** CPL backup v7. Install as a separate Apps Script; keep the existing v5 job intact.
 * Script Properties: SUPABASE_URL, SUPABASE_SECRET_KEY. Never put the secret in Pages.
 * For restoration, configure only CPL-DEV. Do not point restoreCplDevBackupV7 at production.
 */
const CPL_V7_TABLES = [
  ['master_options','id'],['course_research','id'],['research_hypotheses','id'],
  ['races','id'],['race_results','id'],['race_evaluations','race_id'],
  ['race_evaluation_revisions','race_id,revision_no'],
  ['race_runner_evaluations','race_id,revision_no,horse_number'],
  ['race_runner_outcomes','race_id,horse_number'],
  ['suitability_observations','race_id,horse_number'],
  ['condition_observations','race_id,horse_number']
];
const CPL_V7_FOLDER = 'CPL_BACKUP_DEV_V7';

function cplV7Config_() {
  const props=PropertiesService.getScriptProperties();
  const url=props.getProperty('SUPABASE_URL'), key=props.getProperty('SUPABASE_SECRET_KEY');
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw Error('バックアップ接続設定が不正です');
  return {url,key};
}
function cplV7Request_(config,table,method,query,body) {
  const response=UrlFetchApp.fetch(config.url+'/rest/v1/'+table+(query||''),{
    method, muteHttpExceptions:true,contentType:'application/json',
    headers:{apikey:config.key,Authorization:'Bearer '+config.key,Prefer:'return=representation'},
    payload:body===undefined?undefined:JSON.stringify(body)
  });
  if (response.getResponseCode()<200||response.getResponseCode()>=300)
    throw Error(table+' HTTP '+response.getResponseCode()+' '+response.getContentText());
  return response.getContentText()?JSON.parse(response.getContentText()):[];
}
function cplV7Fetch_(config,table,order) {
  const rows=[];let offset=0;
  while(true){const page=cplV7Request_(config,table,'get','?select=*&order='+
    encodeURIComponent(order.split(',').map(x=>x+'.asc').join(','))+'&offset='+offset+'&limit=1000');
    rows.push.apply(rows,page);if(page.length<1000)break;offset+=1000;}
  return rows;
}
function runCplBackupV7() {
  const config=cplV7Config_(), backup={backup_version:7,source_project:new URL(config.url).hostname.split('.')[0],
    created_at:new Date().toISOString(),tables:{},counts:{}};
  CPL_V7_TABLES.forEach(([table,order])=>{const rows=cplV7Fetch_(config,table,order);
    backup.tables[table]=rows;backup.counts[table]=rows.length;});
  const folders=DriveApp.getFoldersByName(CPL_V7_FOLDER);
  const folder=folders.hasNext()?folders.next():DriveApp.createFolder(CPL_V7_FOLDER);
  const file=folder.createFile('CPL_V7_'+Utilities.formatDate(new Date(),'Asia/Tokyo','yyyyMMdd_HHmmss')+'.json',
    JSON.stringify(backup),MimeType.PLAIN_TEXT);
  return {file_id:file.getId(),counts:backup.counts};
}
/** Restore into an EMPTY CPL-DEV research dataset only; masters/research reference rows are verified, not rewritten.
 * Execute only with a chosen backup file ID after checking its contents. Existing users are never deleted.
 */
function restoreCplDevBackupV7(fileId) {
  const config=cplV7Config_(), project=new URL(config.url).hostname.split('.')[0];
  if(project!=='kczisspagwqzdvaeemir')throw Error('復元はCPL-DEV専用です');
  const backup=JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
  if(backup.backup_version!==7||backup.source_project!==project||!backup.tables||!backup.counts)
    throw Error('バックアップの版または接続先が一致しません');
  CPL_V7_TABLES.forEach(([table,order])=>{
    if(!Array.isArray(backup.tables[table])||backup.counts[table]!==backup.tables[table].length)
      throw Error(table+' のバックアップが不完全です');
    if(['master_options','course_research','research_hypotheses'].includes(table))return;
    if(cplV7Fetch_(config,table,order).length!==0)throw Error(table+' に既存データがあります');
  });
  for(const [table,order] of CPL_V7_TABLES){
    if(['master_options','course_research','research_hypotheses'].includes(table)){
      if(JSON.stringify(cplV7Fetch_(config,table,order))!==JSON.stringify(backup.tables[table]))
        throw Error(table+' のマスターまたは研究資料が異なります');
      continue;
    }
    const rows=backup.tables[table];
    for(let i=0;i<rows.length;i+=250)cplV7Request_(config,table,'post','',rows.slice(i,i+250));
    if(cplV7Fetch_(config,table,order).length!==backup.counts[table])throw Error(table+' 件数不一致');
  }
  return {restored_counts:backup.counts};
}
