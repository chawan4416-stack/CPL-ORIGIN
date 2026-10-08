const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../suitability-summary.js');
function screen(){
 const els=new Map(),events={},storage=new Map(),calls=[],queries=[];
 const el=id=>{if(!els.has(id))els.set(id,{innerHTML:'',textContent:'',children:[],scrollLeft:0,hidden:false,style:{setProperty(){},removeProperty(){}},classList:{toggle(){}},setAttribute(){},scrollIntoView(){},replaceChildren(){this.innerHTML=''},addEventListener(){},firstChild:{textContent:''}});return els.get(id)};
 let queryRows=[];
 const db={from:table=>{const filters=[],bounds=[];let start=0,end=499;queries.push(filters);const q={};for(const method of ['select','order'])q[method]=()=>q;q.gte=(key,value)=>{bounds.push(row=>Number(row[key])>=value);return q};q.lte=(key,value)=>{bounds.push(row=>Number(row[key])<=value);return q};q.range=(a,b)=>{start=a;end=b;return q};q.eq=(key,value)=>{filters.push([key,value]);return q};q.then=(resolve,reject)=>Promise.resolve({data:queryRows.filter(row=>filters.every(([key,value])=>String(key.startsWith('races.')?row.races?.[key.slice(6)]:row[key])===String(value))&&bounds.every(check=>check(row))).slice(start,end+1)}).then(resolve,reject);return q},rpc:async(name,args)=>{calls.push({name,args});return {data:'race-test'}},auth:{getSession:()=>new Promise(()=>{}),onAuthStateChange(){}}};
 const window={CPL_SUPABASE_URL:'https://ekgislctkribtztazvsd.supabase.co',CPL_SUPABASE_KEY:'sb_publishable_test',supabase:{createClient:()=>db},CPLSuitabilitySummary:S,CPLConditionSummary:require('./helpers/condition-tools.cjs'),addEventListener(){},scrollTo(){}};
 const context={window,console,document:{getElementById:el,querySelector:()=>el('selector'),querySelectorAll:()=>[],addEventListener:(k,fn)=>events[k]=fn},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null},scrollY:0,Date,Math,JSON,Map,Set,Number,String,Promise,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:f=>f()};
 const source=fs.readFileSync(require.resolve('../research.js'),'utf8').replace(/\}\)\(\);\s*$/,'window.__test={state,newHorse,renderHorse,saveSuitability,draft,restore,draftKey,renderSummaryDetail,setDetail:r=>detailRows=r,loadSuitabilityDetail};})();');
 vm.runInNewContext(source,context);const t=window.__test;t.state.user={id:'test'};
 for(const [key,labels] of [['CHEST',S.chestOrder],['HINDQUARTER',S.hindOrder],['HINDQUARTER_DENSITY',S.densityOrder],['HINDQUARTER_TEXTURE',['標準','張りあり','弾力あり']]])t.state.masters['SUITABILITY:'+key]=labels.map(option_value=>({option_value}));
 t.state.sRace={race_date:'2026-10-07',racecourse:'東京',race_number:'11',surface:'芝',distance:'1600',course:'通常',track_condition:'良',field_size:'18',race_class:'G1'};
 return {t,el,events,storage,calls,queries,setQueryRows:r=>queryRows=r};
}
const horse={popularity:'1',finish_position:'1',chest:'厚',hindquarter:'シャープ',hindquarter_density:'充足',hindquarter_texture:'標準'};
test('real click handler supports exclusive standard, combined characteristics and NULL',async()=>{
 const {t,events,el}=screen();t.state.horses=[{...horse}];
 const click=value=>events.click({target:{closest:()=>({dataset:{group:'hindquarter_texture',value}})}});
 await click('張りあり');assert.equal(t.state.horses[0].hindquarter_texture,'張りあり');
 await click('弾力あり');assert.equal(t.state.horses[0].hindquarter_texture,'張りあり＋弾力あり');
 assert.equal((el('horseEditor').innerHTML.match(/data-group="hindquarter_texture"[^>]*aria-pressed="true"/g)||[]).length,2);
 await click('標準');assert.equal(t.state.horses[0].hindquarter_texture,'標準');
 await click('標準');assert.equal(t.state.horses[0].hindquarter_texture,null);
});
test('save is blocked for each missing axis and sends exact new fields when complete',async()=>{
 for(const key of ['chest','hindquarter','hindquarter_density','hindquarter_texture']){
  const {t,calls,el}=screen();t.state.horses=[{...horse,[key]:null}];await t.saveSuitability();assert.equal(calls.length,0);assert.match(el('messageText').textContent,/未入力/);
 }
 const {t,calls}=screen();t.state.horses=[{...horse,hindquarter_texture:'張りあり＋弾力あり'}];await t.saveSuitability();
 assert.equal(calls[0].args.p_horses[0].hindquarter_texture,'張りあり＋弾力あり');assert.equal('tone' in calls[0].args.p_horses[0],false);
});
test('draft round trip preserves NULL and condition; old suitability draft alone resets',()=>{
 const {t,storage}=screen();t.state.horses=[{...horse,hindquarter_texture:null}];t.state.condition.chaka=true;t.draft();t.state.horses=[];t.restore();
 assert.equal(t.state.horses[0].hindquarter_texture,null);assert.equal(t.state.condition.chaka,true);
 const saved=JSON.parse(storage.get(t.draftKey()));delete saved.suitabilityVersion;saved.horses=[{...horse,chest:'厚−',tone:'パンパン'}];storage.set(t.draftKey(),JSON.stringify(saved));t.restore();
 assert.equal(t.state.horses[0].chest,'');assert.equal(t.state.horses[0].hindquarter_texture,null);assert.equal(t.state.condition.chaka,true);
});
test('record reopening restores all four axes without mapping',async()=>{
 const {t,events}=screen();t.state.records=[{...t.state.sRace,id:'r',suitability:[{...horse,hindquarter_texture:'弾力あり'}]}];
 await events.click({target:{closest:()=>({dataset:{openSuit:'r'}})}});assert.equal(t.state.horses[0].hindquarter_density,'充足');assert.equal(t.state.horses[0].hindquarter_texture,'弾力あり');
});
test('detail renders nine shape cells and four exclusive texture rows with denominator',()=>{
 const {t,el}=screen();t.setDetail(S.fromObservations(S.textureOrder.map(texture=>({...horse,hindquarter_texture:texture}))));t.renderSummaryDetail();
 assert.equal((el('matrix').innerHTML.match(/<button /g)||[]).length,9);
 assert.equal((el('suitabilityTextureDetail').innerHTML.match(/1頭 \/ 4頭/g)||[]).length,4);
 assert.match(el('suitabilityTextureDetail').innerHTML,/25.0%/);assert.match(el('suitabilityDensityDetail').innerHTML,/4頭 \/ 4頭　100.0%/);
});

test('detail applies five race conditions plus class and popularity to its observation query',async()=>{
 const {t,el,setQueryRows}=screen();const race={racecourse:'東京',surface:'芝',distance:'1600',course:'通常',track_condition:'良',race_class:'G1'};
 t.state.filter={...race};t.state.suitabilityAppliedFilter={...race};t.state.suitabilityAdvanced={race_class:'G1',popularity:'2'};
 setQueryRows([{...horse,popularity:2,races:race},{...horse,popularity:1,races:race},{...horse,popularity:2,races:{...race,race_class:'G3'}},{...horse,popularity:2,races:{...race,track_condition:'重'}}]);
 await t.loadSuitabilityDetail();assert.equal(el('suitabilityDetailSample').textContent,'n = 1頭');
});

const rankingRace={racecourse:'東京',surface:'芝',distance:'1600',course:'通常',track_condition:'良',race_class:'G1'};
function rankingScreen(){const view=screen();view.t.state.suitabilityAppliedFilter={...rankingRace};view.t.state.filter={...rankingRace};return view;}
test('ranking switch uses filtered raw finishers and leaves every existing detail result unchanged',async()=>{
 const {t,el,events,setQueryRows,queries}=rankingScreen();
 setQueryRows([1,1,2,3].map((finish,i)=>({...horse,id:i,finish_position:finish,chest:i%2?'シャープ':'厚',races:rankingRace})));
 await t.loadSuitabilityDetail();
 assert.match(el('suitabilityRankingResult').innerHTML,/n=4/);
 const original=['matrix','suitabilityDensityDetail','suitabilityTextureDetail'].map(id=>el(id).innerHTML);
 for(const [finish,title,n] of [[1,'勝ち馬',2],[2,'連対馬',3],[3,'複勝圏馬',4]]){
  await events.click({target:{closest:()=>({dataset:{suitabilityRanking:String(finish)}})}});
  assert.equal(el('suitabilityRankingTitle').textContent,title+'：公式'+(finish===1?'1着':'1〜'+finish+'着'));
  assert.match(el('suitabilityRankingResult').innerHTML,new RegExp('n='+n));
  assert.equal((el('suitabilityRankingTabs').innerHTML.match(/aria-pressed="true"/g)||[]).length,1);
  assert.deepEqual(['matrix','suitabilityDensityDetail','suitabilityTextureDetail'].map(id=>el(id).innerHTML),original);
 }
 assert.equal(queries.length,1);
});
test('all five filters, class and popularity determine each ranking denominator',async()=>{
 const {t,el,setQueryRows,events}=rankingScreen();t.state.suitabilityAdvanced={race_class:'G1',popularity:'2'};
 const target={...horse,id:'target',popularity:2,races:rankingRace};
 const mismatches=Object.entries({racecourse:'京都',surface:'ダート',distance:1800,course:'外',track_condition:'重',race_class:'G3'}).map(([key,value],i)=>({...target,id:i,races:{...rankingRace,[key]:value}}));
 setQueryRows([target,...mismatches,{...target,popularity:1},{...target,finish_position:4}]);
 await t.loadSuitabilityDetail();
 for(const finish of [1,2,3]){
  await events.click({target:{closest:()=>({dataset:{suitabilityRanking:String(finish)}})}});
  assert.match(el('suitabilityRankingResult').innerHTML,/1頭 \/ n=1　100.0%/);
 }
 t.state.suitabilityAdvanced.popularity='18';await t.loadSuitabilityDetail();
 assert.match(el('suitabilityRankingResult').innerHTML,/該当データなし/);assert.equal((el('suitabilityRankingResult').innerHTML.match(/0頭 \/ n=0/g)||[]).length,6);
});
test('pagination includes all observations and a late first-place observation',async()=>{
 const {t,el,setQueryRows,events,queries}=rankingScreen();
 setQueryRows(Array.from({length:501},(_,i)=>({...horse,id:i,finish_position:i===500?1:3,races:rankingRace})));
 await t.loadSuitabilityDetail();assert.equal(queries.length,2);assert.match(el('suitabilityRankingResult').innerHTML,/n=501/);
 await events.click({target:{closest:()=>({dataset:{suitabilityRanking:'1'}})}});
 assert.match(el('suitabilityRankingResult').innerHTML,/1頭 \/ n=1/);
});
test('failed reload clears the previous ranking rather than showing stale filter results',async()=>{
 const {t,el,setQueryRows}=rankingScreen();setQueryRows([{...horse,races:rankingRace}]);await t.loadSuitabilityDetail();
 setQueryRows(null);await t.loadSuitabilityDetail();assert.equal(el('suitabilityRankingResult').innerHTML,'');assert.equal(el('suitabilityDetailSample').textContent,'詳細を取得できませんでした');
});

test('ranking shows only density/texture with six proportional bars, zero categories and safe empty bars',async()=>{
 const {t,el,setQueryRows,events}=rankingScreen();
 setQueryRows([{...horse,finish_position:1,races:rankingRace},{...horse,finish_position:2,hindquarter_density:'未充足',hindquarter_texture:'張りあり＋弾力あり',races:rankingRace}]);
 await t.loadSuitabilityDetail();
 let html=el('suitabilityRankingResult').innerHTML;
 assert.match(html,/トモ密度ランキング/);assert.match(html,/トモ質感ランキング/);assert.doesNotMatch(html,/胸前|× トモ/);
 assert.equal((html.match(/<progress /g)||[]).length,6);
 assert.equal((html.match(/value="1" max="2"/g)||[]).length,4);
 assert.equal((html.match(/value="0" max="2"/g)||[]).length,2);
 assert.equal((html.match(/50.0%<\/span>/g)||[]).length,4);
 await events.click({target:{closest:()=>({dataset:{suitabilityRanking:'1'}})}});
 html=el('suitabilityRankingResult').innerHTML;
 assert.equal((html.match(/value="1" max="1"/g)||[]).length,2);
 assert.equal((html.match(/value="0" max="1"/g)||[]).length,4);
 setQueryRows([]);await t.loadSuitabilityDetail();html=el('suitabilityRankingResult').innerHTML;
 assert.match(html,/該当データなし/);assert.equal((html.match(/value="0" max="1"/g)||[]).length,6);
 assert.doesNotMatch(html,/NaN|Infinity|0.0%/);
});
