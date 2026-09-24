const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const masters = [
  ['RACE','RACECOURSE','中山'],['RACE','SURFACE','芝'],['RACE','TRACK_CONDITION','良'],
  ['COURSE_DISTANCE','中山:芝:2000','内回り'],['RACE_CLASS','中山','未勝利'],
  ['BODY','CHEST','厚'],['BODY','HINDQUARTER','シャープ'],['BODY','TONE','パンパン'],
  ['BODY','GAIT','普通'],['BODY','BALANCE','均整'],['BODY','FLANK_TUCK','なし'],
  ['BODY','FLANK_TUCK','少しあり'],['BODY','FLANK_TUCK','深い']
].map(([category,field_key,option_value],sort_order) => ({category,field_key,option_value,sort_order,active:true}));

function createHarness(local=new Map(), options={}) {
  const listeners={};
  const content={innerHTML:'',addEventListener(name,listener){listeners[name]=listener;}};
  const status={textContent:''};
  function button(){return {disabled:false,handlers:{},classList:{toggle(){},add(){},remove(){}},addEventListener(name,fn){this.handlers[name]=fn;}};}
  const login=button(),logout=button();
  const created=[];
  const db={races:[],race_evaluations:[],race_evaluation_revisions:[],race_runner_evaluations:[],race_runner_outcomes:[]};
  const calls=[];
  const id='00000000-0000-4000-8000-000000000001';
  function query(table) {
    const q={filters:[],one:false,limitN:null};
    for (const key of ['select','order']) q[key]=()=>q;
    q.eq=(key,value)=>{q.filters.push([key,value]);return q;};
    q.limit=n=>{q.limitN=n;return q;};
    q.single=()=>{q.one=true;return q;};
    q.then=(resolve,reject)=>{
      let rows=(table==='master_options' ? masters : db[table]).filter(row=>q.filters.every(([key,value])=>row[key]===value));
      if(q.limitN)rows=rows.slice(0,q.limitN);
      rows=rows.map(row=>structuredClone(row)); // A REST response does not share objects with stored rows.
      return Promise.resolve({data:q.one ? rows[0] : rows,error:null}).then(resolve,reject);
    };
    return q;
  }
  const client={
    from:query,
    auth:{onAuthStateChange(fn){this.notify=fn;},
      getSession:async()=>({data:{session:options.signedOut?null:{user:{id:'tester'}}},error:null}),
      signInWithOAuth:async args=>{calls.push({name:'oauth',args});return {error:null};},
      signOut:async()=>{calls.push({name:'beta-signout'});client.auth.notify?.('SIGNED_OUT',null);return {error:null};}},
    rpc:async(name,args)=>{
      calls.push({name,args});
      if(name==='confirm_race_evaluation'){
        db.races.push({...args.p_race,id});
        db.race_evaluations.push({race_id:id,status:'confirmed',result_status:null,
          current_revision_no:1,result_review_started_at:null});
        db.race_evaluation_revisions.push({race_id:id,revision_no:1,knowledge_state:'pre_review',
          created_at:new Date().toISOString(),no_suitable_horse:args.p_no_suitable,
          no_focus_horse:args.p_no_focus});
        db.race_runner_evaluations.push(...args.p_runners.map(row=>({...row,race_id:id,revision_no:1})));
        return {data:id,error:null};
      }
      if(name==='begin_result_review'){
        db.race_evaluations[0].result_review_started_at=new Date().toISOString();
        return {data:db.race_evaluations[0].result_review_started_at,error:null};
      }
      if(name==='save_race_outcomes'){
        db.race_evaluations[0].result_status=args.p_result_status;
        db.race_runner_outcomes=args.p_outcomes?.map(row=>({...row,race_id:id})) || [];
        return {data:null,error:null};
      }
      if(name==='revise_race_evaluation'){
        const next=++db.race_evaluations[0].current_revision_no;
        db.race_evaluation_revisions.push({race_id:id,revision_no:next,
          knowledge_state:db.race_evaluations[0].result_review_started_at ? 'post_review':'pre_review',
          created_at:new Date().toISOString(),no_suitable_horse:args.p_no_suitable,
          no_focus_horse:args.p_no_focus});
        db.race_runner_evaluations.push(...args.p_runners.map(row=>({...row,race_id:id,revision_no:next})));
        return {data:next,error:null};
      }
      return {data:null,error:{message:'UNKNOWN_RPC'}};
    }
  };
  const context={
    window:{CPL_BETA_CONFIG:options.config || {projectRef:'kczisspagwqzdvaeemir',
      url:'https://kczisspagwqzdvaeemir.supabase.co',publishableKey:'sb_publishable_test'},
      CPLAllRunnerCore:require('../all-runner-core.js').CPLAllRunnerCore,
      supabase:{createClient:(...args)=>{created.push(args);return client;}},
      location:{origin:'https://chawan4416-stack.github.io',pathname:'/CPL-ORIGIN/all-runner.html'},
      scrollTo(){},confirm:()=>true,
      addEventListener(){}},
    document:{getElementById:id=>({arContent:content,arStatus:status,arLogin:login,arLogout:logout})[id],
      addEventListener(){},visibilityState:'visible'},
    localStorage:{getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},
    console,Date
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../all-runner.js'),'utf8'),context);
  const click=async(action,extra={})=>{
    const button={dataset:{action,...extra},disabled:false,isConnected:false};
    await listeners.click({target:{closest:()=>button}});
  };
  const change=(key,value)=>{
    const el={dataset:key,value};
    listeners.change({target:el});
  };
  return {content,status,login,logout,created,local,calls,db,click,change};
}

test('β専用認証と本番下書きが独立し、ログアウトもβだけに作用する',async()=>{
  const local=new Map([['CPL_V1_INPUT_DRAFT_tester','production draft']]);
  const ui=createHarness(local,{signedOut:true});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ui.created.length,1);
  assert.equal(ui.created[0][0],'https://kczisspagwqzdvaeemir.supabase.co');
  assert.equal(ui.created[0][2].auth.storageKey,'cpl-dev-kczisspagwqzdvaeemir-all-runner-beta-auth');
  await ui.login.handlers.click();
  assert.equal(ui.calls.find(c=>c.name==='oauth').args.options.redirectTo,
    'https://chawan4416-stack.github.io/CPL-ORIGIN/all-runner.html');
  await ui.logout.handlers.click();
  assert.equal(local.get('CPL_V1_INPUT_DRAFT_tester'),'production draft');
  assert.equal(ui.calls.filter(c=>c.name==='beta-signout').length,1);
});

test('本番URLへ差し替わったβ設定はDBクライアント作成前に拒否する',()=>{
  const ui=createHarness(new Map(),{config:{projectRef:'kczisspagwqzdvaeemir',
    url:'https://other.supabase.co',publishableKey:'sb_publishable_test'}});
  assert.equal(ui.created.length,0);
  assert.equal(ui.login.disabled,true);
  assert.match(ui.status.textContent,/接続を停止/);
});

test('馬番自由切替、下書き、初回確定、結果確認境界、同着、修正履歴',async()=>{
  const ui=createHarness();
  // Allow asynchronous getSession/boot to settle.
  await new Promise(resolve=>setImmediate(resolve));
  await ui.click('new');
  ui.change({race:'race_class'},'未勝利');
  ui.change({race:'field_size'},'3');
  await ui.click('race-next');
  assert.match(ui.content.innerHTML,/0\/3頭/);
  await ui.click('horse',{number:'3'});
  assert.match(ui.content.innerHTML,/3番　未入力/);
  for(const horse of [3,1,2]){
    await ui.click('horse',{number:String(horse)});
    for(const [prop,value] of Object.entries({chest:'厚',hindquarter:'シャープ',tone:'パンパン',
      gait:'普通',balance:'均整',flank_tuck:'なし'})) ui.change({runner:prop},value);
  }
  assert.ok(ui.local.has('CPL_DEV_kczisspagwqzdvaeemir_ALL_RUNNER_BETA_DRAFT_tester_new'));
  await ui.click('runner-next');
  await ui.click('suitable',{number:'1'});
  await ui.click('suitable-next');
  await ui.click('focus',{number:'1'});
  await ui.click('focus-next');
  await ui.click('confirm');
  assert.equal(ui.calls.find(c=>c.name==='confirm_race_evaluation').args.p_runners.length,3);
  assert.equal(ui.local.has('CPL_DEV_kczisspagwqzdvaeemir_ALL_RUNNER_BETA_DRAFT_tester_new'),false);
  await ui.click('review');
  assert.ok(ui.calls.find(c=>c.name==='begin_result_review'));
  assert.match(ui.content.innerHTML,/結果画面を開いた時刻/);
  for(let n=1;n<=3;n++)ui.change({outcome:'popularity',number:String(n)},String(n));
  await ui.click('rank',{number:'1',rank:'1'});
  await ui.click('rank',{number:'2',rank:'2'});
  await ui.click('rank',{number:'3',rank:'2'});
  await ui.click('save-outcomes');
  assert.deepEqual(ui.db.race_runner_outcomes.map(r=>r.finish_position),[1,2,2]);
  await ui.click('edit');
  await ui.click('runner-next');
  await ui.click('suitable-next');
  await ui.click('focus-next');
  await ui.click('confirm');
  assert.equal(ui.db.race_evaluation_revisions[1].knowledge_state,'post_review');
  await ui.click('history');
  assert.match(ui.content.innerHTML,/revision 1/);
  assert.match(ui.content.innerHTML,/revision 2/);
});

test('ページ再読み込み相当で馬番と入力途中のドラフトを復元',async()=>{
  const local=new Map();
  const first=createHarness(local);
  await new Promise(resolve=>setImmediate(resolve));
  await first.click('new');
  first.change({race:'field_size'},'4');
  await first.click('race-next');
  await first.click('horse',{number:'4'});
  first.change({runner:'chest'},'厚');
  const second=createHarness(local);
  await new Promise(resolve=>setImmediate(resolve));
  await second.click('new');
  assert.match(second.content.innerHTML,/4番　未入力/);
  assert.match(second.content.innerHTML,/option value="厚" selected/);
});

test('出走取消と不成立は人気を要求せず、評価履歴を残す',async()=>{
  const ui=createHarness();
  await new Promise(resolve=>setImmediate(resolve));
  await ui.click('new');
  ui.change({race:'race_class'},'未勝利');
  ui.change({race:'field_size'},'2');
  await ui.click('race-next');
  for(const [prop,value] of Object.entries({chest:'厚',hindquarter:'シャープ',tone:'パンパン',
    gait:'普通',balance:'均整',flank_tuck:'なし'}))ui.change({runner:prop},value);
  await ui.click('horse',{number:'2'});
  await ui.click('scratch');
  await ui.click('runner-next');
  await ui.click('suitable-next');
  await ui.click('focus-next');
  await ui.click('confirm');
  assert.equal(ui.db.race_runner_evaluations[1].entry_status,'scratched');
  await ui.click('review');
  await ui.click('result-status',{value:'void'});
  await ui.click('save-outcomes');
  assert.equal(ui.db.race_evaluations[0].result_status,'void');
  assert.equal(ui.db.race_runner_outcomes.length,0);
  assert.equal(ui.db.race_evaluation_revisions.length,1);
  assert.ok(ui.db.race_evaluations[0].result_review_started_at);
});

test('16頭の自由入力・下書き復元・全頭人気・3着同着・初回判断の保持',async()=>{
  const local=new Map();
  const first=createHarness(local);
  await new Promise(resolve=>setImmediate(resolve));
  await first.click('new');
  first.change({race:'race_class'},'未勝利');
  first.change({race:'field_size'},'16');
  await first.click('race-next');
  await first.click('horse',{number:'16'});
  first.change({runner:'flank_tuck'},'深い');
  const ui=createHarness(local);
  await new Promise(resolve=>setImmediate(resolve));
  await ui.click('new');
  assert.match(ui.content.innerHTML,/16番　未入力/);
  assert.match(ui.content.innerHTML,/option value="深い" selected/);
  for(const n of [16,...Array.from({length:15},(_,i)=>15-i)]){
    await ui.click('horse',{number:String(n)});
    for(const [prop,value] of Object.entries({chest:'厚',hindquarter:'シャープ',tone:'パンパン',
      gait:'普通',balance:'均整',flank_tuck:n===16?'深い':'なし'}))ui.change({runner:prop},value);
  }
  await ui.click('horse',{number:'16'});
  assert.match(ui.content.innerHTML,/16\/16頭/);
  await ui.click('runner-next');
  await ui.click('suitable',{number:'1'});
  await ui.click('suitable',{number:'16'});
  await ui.click('suitable-next');
  await ui.click('focus',{number:'16'});
  await ui.click('focus-next');
  await ui.click('confirm');
  const initial=ui.db.race_runner_evaluations.filter(r=>r.revision_no===1);
  assert.equal(initial.length,16);
  assert.equal(initial[15].flank_tuck,'深い');
  assert.deepEqual(initial.filter(r=>r.is_suitable).map(r=>r.horse_number),[1,16]);
  await ui.click('review');
  for(let n=1;n<=16;n++)ui.change({outcome:'popularity',number:String(n)},String(n));
  for(const [number,rank] of [[1,1],[2,2],[3,3],[4,3]])
    await ui.click('rank',{number:String(number),rank:String(rank)});
  await ui.click('save-outcomes');
  assert.equal(ui.db.race_runner_outcomes.length,16);
  assert.equal(ui.db.race_runner_outcomes.filter(r=>r.finish_position===3).length,2);
  await ui.click('edit');
  ui.change({runner:'chest'},'重厚');
  await ui.click('runner-next');
  await ui.click('suitable-next');
  await ui.click('focus-next');
  await ui.click('confirm');
  assert.equal(ui.db.race_evaluation_revisions[1].knowledge_state,'post_review');
  assert.equal(ui.db.race_runner_evaluations.find(r=>r.revision_no===1&&r.horse_number===1).chest,'厚');
  assert.equal(ui.db.race_runner_evaluations.find(r=>r.revision_no===2&&r.horse_number===1).chest,'重厚');
});
