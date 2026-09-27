const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../ops/CPLBackupV7.gs'),'utf8');
let project='kczisspagwqzdvaeemir', created, fileContent;
const tables={master_options:[{id:'master'}],course_research:[{id:1}],research_hypotheses:[{id:1}],
  races:[{id:'race'}],race_results:[],race_evaluations:[],race_evaluation_revisions:[],
  race_runner_evaluations:[],race_runner_outcomes:[],
  suitability_observations:[{race_id:'race',horse_number:1}],
  condition_observations:[{race_id:'race',horse_number:2}]};
const context={URL,Date,JSON,Error,console,
  MimeType:{PLAIN_TEXT:'text/plain'},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='SUPABASE_URL'?`https://${project}.supabase.co`:'dev-secret'})},
  UrlFetchApp:{fetch:(url,options)=>{const table=url.split('/rest/v1/')[1].split('?')[0];
    const start=Number(new URL(url).searchParams.get('offset')||0);
    const result=options.method==='get'?tables[table].slice(start,start+1000):(
      tables[table].push(...JSON.parse(options.payload)),JSON.parse(options.payload));
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};}},
  Utilities:{formatDate:()=> '20260927_230000'},
  DriveApp:{getFoldersByName:()=>({hasNext:()=>false}),createFolder:()=>({createFile:(name,body)=>{
    fileContent=body;created=name;return {getId:()=> 'backup-id'};}}),
    getFileById:()=>({getBlob:()=>({getDataAsString:()=>fileContent})})}
};
vm.createContext(context);vm.runInContext(source,context);
const result=context.runCplBackupV7();
assert.equal(result.counts.suitability_observations,1);
assert.equal(result.counts.condition_observations,1);
assert.match(created,/^CPL_V7_/);
for(const name of Object.keys(tables))if(!['master_options','course_research','research_hypotheses'].includes(name))tables[name]=[];
const restored=context.restoreCplDevBackupV7('backup-id');
assert.equal(restored.restored_counts.races,1);
assert.equal(tables.suitability_observations.length,1);
assert.equal(tables.condition_observations.length,1);
project='ekgislctkribtztazvsd';
assert.throws(()=>context.restoreCplDevBackupV7('backup-id'),/CPL-DEV専用/);
console.log('backup v7 generation, restore, counts, production guard: ok');
