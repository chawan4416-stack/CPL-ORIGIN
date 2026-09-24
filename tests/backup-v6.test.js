const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../ops/CPLBackupV6.gs'),'utf8');
function harness(data) {
  const files=[{getName:()=> 'CPL_BACKUP_20260923_1200.json',setTrashed(){throw Error('v5 file was removed');}}];
  const requested=[];
  const folder={
    createFile(name,contents){const file={getName:()=>name,contents,setTrashed(){this.trashed=true;}};files.push(file);return file;},
    getFiles(){let i=0;return {hasNext:()=>i<files.length,next:()=>files[i++]};}
  };
  const context={
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='SUPABASE_URL' ?
      'https://development.supabase.co':'dev-secret'})},
    UrlFetchApp:{fetch(raw){const url=new URL(raw);const name=url.pathname.split('/').pop();
      requested.push({name,order:url.searchParams.get('order')});
      const offset=Number(url.searchParams.get('offset'));
      const limit=Number(url.searchParams.get('limit'));
      const page=(data[name]||[]).slice(offset,offset+limit);
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(page)};
    }},
    DriveApp:{getFoldersByName:()=>({hasNext:()=>true,next:()=>folder})},
    Utilities:{formatDate:()=> '20260924_221500'},Session:{getScriptTimeZone:()=> 'Asia/Tokyo'},
    MimeType:{PLAIN_TEXT:'text/plain'},Date,JSON,Map,Set,Object,URL,Array,Error
  };
  vm.runInNewContext(source,context);
  return {context,files,requested};
}

const fixture={
  races:[{id:'race-a',field_size:2}],race_results:[],
  race_evaluations:[{race_id:'race-a',current_revision_no:2,result_status:'official'}],
  race_evaluation_revisions:[{race_id:'race-a',revision_no:1},{race_id:'race-a',revision_no:2}],
  race_runner_evaluations:[1,2].flatMap(revision_no=>[1,2].map(horse_number=>
    ({race_id:'race-a',revision_no,horse_number}))),
  race_runner_outcomes:[{race_id:'race-a',horse_number:1,finish_position:1},
    {race_id:'race-a',horse_number:2,finish_position:2}]
};

test('v6は6テーブルを保存し、旧v5ファイルを残す',()=>{
  const h=harness(fixture);
  const result=h.context.runCplBackupV6();
  assert.match(result.filename,/^CPL_BACKUP_V6_/);
  assert.equal(h.files.length,2);
  const backup=JSON.parse(h.files[1].contents);
  assert.equal(backup.backup_version,6);
  assert.equal(backup.source_project_ref,'development');
  assert.deepEqual(Object.keys(result.counts),['races','race_results','race_evaluations',
    'race_evaluation_revisions','race_runner_evaluations','race_runner_outcomes']);
  assert.equal(backup.race_runner_evaluations.length,4);
  assert.ok(h.requested.some(q=>q.name==='race_runner_evaluations' &&
    q.order==='race_id.asc,revision_no.asc,horse_number.asc'));
  assert.equal(h.files[0].getName(),'CPL_BACKUP_20260923_1200.json');
});

test('不完全なスナップショットはバックアップを作らない',()=>{
  const broken={...fixture,race_runner_evaluations:fixture.race_runner_evaluations.slice(0,3)};
  const h=harness(broken);
  assert.throws(()=>h.context.runCplBackupV6(),/Incomplete full evaluation snapshot/);
  assert.equal(h.files.length,1);
});

test('1000行のページ境界を越えて全行を取得',()=>{
  const many={races:Array.from({length:1001},(_,i)=>({id:`race-${i}`,field_size:1})),
    race_results:[],race_evaluations:[],race_evaluation_revisions:[],
    race_runner_evaluations:[],race_runner_outcomes:[]};
  const h=harness(many);
  const result=h.context.runCplBackupV6();
  assert.equal(result.counts.races,1001);
  assert.equal(h.requested.filter(q=>q.name==='races').length,2);
});
