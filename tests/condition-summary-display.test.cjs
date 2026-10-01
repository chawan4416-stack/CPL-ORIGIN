const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function screen(rows){
 const els=new Map(),events={};
 const el=id=>{if(!els.has(id))els.set(id,{innerHTML:'',textContent:'',hidden:false,disabled:false,
  style:{setProperty(){},removeProperty(){}},setAttribute(){},querySelectorAll(){return []},classList:{toggle(){}}});return els.get(id)};
 const db={auth:{onAuthStateChange(){},getSession:()=>new Promise(()=>{})}};
 const context={console,Date,Math,Number,String,JSON,Map,Set,Promise,setTimeout,clearTimeout,
  localStorage:{setItem(){},getItem(){return null}},
  window:{CPL_BETA_CONFIG:{projectRef:'kczisspagwqzdvaeemir',url:'https://kczisspagwqzdvaeemir.supabase.co',publishableKey:'sb_publishable_test'},
   CPLSuitabilitySummary:require('../suitability-summary.js'),CPLConditionSummary:require('../condition-summary.js'),
   supabase:{createClient:()=>db},addEventListener(){},scrollTo(){}},
  document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('figure'),addEventListener:(name,fn)=>events[name]=fn},
  location:{origin:'https://local.test',pathname:'/research.html'},requestAnimationFrame:f=>f()};
 const source=fs.readFileSync(path.join(root,'research.js'),'utf8').replace(/\}\)\(\);\s*$/,
  'window.__test={state,renderConditionSummaryResult,renderCombination,setRows:r=>{conditionRows=r;conditionLoaded=true},unload:()=>{conditionLoaded=false}};})();');
 vm.runInNewContext(source,context);
 const t=context.window.__test;t.state.summaryCondition='チャカつき';t.state.conditionExtra='発汗・強';
 t.state.masters={RACE_CLASS:[{category:'RACE_CLASS',option_value:'G1'}]};t.setRows(rows);
 return {t,el,events};
}
const row=(status,finish,both=true)=>({outcome_status:status,finish_position:finish,popularity:1,
 chaka:true,sweating:both?'強':null,races:{race_class:'G1'}});
const cases=[
 ['finished only',[row('finished',1),row('finished',4)],2,0,0],
 ['finished with dnf',[row('finished',1),row('finished',4),row('dnf',null)],2,1,0],
 ['finished with scratched',[row('finished',1),row('finished',4),row('scratched',null)],2,0,1],
 ['finished with both exclusions',[row('finished',1),row('finished',4),row('dnf',null),row('scratched',null)],2,1,1],
 ['only excluded records',[row('dnf',null),row('scratched',null)],0,1,1],
 ['no matching record',[],0,0,0]
];
for(const [name,rows,n,dnf,scratched] of cases)test(name,()=>{
 const {t,el}=screen(rows);t.renderConditionSummaryResult();
 assert.equal(el('conditionSample').textContent,`n=${n}頭（完走）`);
 assert.equal(el('conditionExcluded').hidden,!(dnf||scratched));
 for(const [label,count] of [['競走中止',dnf],['出走取消',scratched]]){
  assert.equal(el('conditionExcluded').textContent.includes(label),!!count);
  if(count)assert.ok(el('conditionExcluded').textContent.includes(`${label} ${count}頭`));
 }
 assert.equal(el('conditionMetrics').hidden,!n);
 if(n){assert.equal(el('conditionPlaced').textContent,'50.0%');assert.equal(el('conditionPlacedCount').textContent,'1頭 / 2頭');}
 else{assert.equal(el('conditionSummaryEmpty').hidden,false);assert.equal(el('conditionSummaryEmpty').textContent,'該当データなし');}
 t.renderCombination();const html=el('conditionCombinationResult').innerHTML;
 if(rows.length)assert.ok(html.includes(`n=${n}頭（完走）`));
 else{assert.ok(html.includes('組み合わせデータなし'));assert.equal(html.includes('condition-combination-card'),false);}
 assert.equal(html.includes('集計対象外'),!!(dnf||scratched));
 if(!n){if(rows.length)assert.ok(html.includes('該当データなし'));assert.equal(html.includes('0.0%'),false);}
});
test('AND exclusions use only records containing both states',()=>{
 const {t,el}=screen([row('finished',1),row('finished',4),row('dnf',null),row('scratched',null,false),row('dnf',null,false)]);
 t.renderConditionSummaryResult();assert.equal(el('conditionExcluded').textContent,'集計対象外：競走中止 2頭 / 出走取消 1頭');
 t.renderCombination();const html=el('conditionCombinationResult').innerHTML;
 assert.ok(html.includes('競走中止 1頭'));assert.equal(html.includes('出走取消'),false);assert.ok(html.includes('1頭 / 2頭'));assert.ok(html.includes('50.0%'));
});
test('loading clears previous exclusions and hides the note',()=>{
 const {t,el}=screen([row('dnf',null)]);t.renderConditionSummaryResult();assert.equal(el('conditionExcluded').hidden,false);
 t.unload();t.renderConditionSummaryResult();assert.equal(el('conditionExcluded').hidden,true);assert.equal(el('conditionExcluded').textContent,'');
});

const {combinations,choices}=require('../condition-summary.js');
test('auto: one real pair renders without an extra action',()=>{
 const {t,el}=screen([row('finished',1)]);t.renderConditionSummaryResult();
 const html=el('conditionCombinationResult').innerHTML;
 assert.ok(html.includes('チャカつき × 発汗・強'));assert.ok(html.includes('n=1頭（完走）'));assert.ok(html.includes('100.0%'));
 assert.equal((html.match(/<article /g)||[]).length,1);
});
test('auto: multiple partners follow fixed state order, not record count',()=>{
 const rows=[{...row('finished',1),fast_walking:true},row('finished',4),row('finished',5)];
 const result=combinations(rows,'チャカつき');
 assert.deepEqual(result.map(x=>[x.otherState,x.observed]),[['早歩き',1],['発汗・強',3]]);
 const {t,el}=screen(rows);t.renderConditionSummaryResult();const html=el('conditionCombinationResult').innerHTML;
 assert.ok(html.indexOf('チャカつき × 早歩き')<html.indexOf('チャカつき × 発汗・強'));
});
test('auto: a record with three states contributes once to each base pair',()=>{
 const rows=[{...row('finished',2),fast_walking:true}];
 assert.deepEqual(combinations(rows,'チャカつき').map(x=>[x.otherState,x.n,x.placed]),[['早歩き',1,1],['発汗・強',1,1]]);
 const {t,el}=screen(rows);t.renderConditionSummaryResult();const html=el('conditionCombinationResult').innerHTML;
 assert.equal((html.match(/<article /g)||[]).length,2);
 assert.equal(html.includes('早歩き × 発汗・強'),false);
});
test('auto: repeated pair across records aggregates into one card',()=>{
 const rows=[row('finished',1),row('finished',4),row('finished',3)];
 const [pair]=combinations(rows,'チャカつき');assert.deepEqual([pair.observed,pair.n,pair.placed,pair.otherPercentage],[3,3,2,33.3]);
 const {t,el}=screen(rows);t.renderConditionSummaryResult();const html=el('conditionCombinationResult').innerHTML;
 assert.equal((html.match(/<article /g)||[]).length,1);assert.ok(html.includes('2頭 / 3頭'));assert.ok(html.includes('1頭 / 3頭'));
});
test('auto: finished-only pair has no exclusion note',()=>{
 const {t,el}=screen([row('finished',4)]);t.renderConditionSummaryResult();const html=el('conditionCombinationResult').innerHTML;
 assert.ok(html.includes('複勝圏（1～3着）'));assert.ok(html.includes('着外（4着以下）'));assert.ok(html.includes('0頭 / 1頭'));assert.ok(html.includes('1頭 / 1頭'));
 assert.equal(html.includes('集計対象外'),false);
});
test('auto: DNF is excluded from a real pair denominator',()=>{
 const [pair]=combinations([row('finished',1),row('dnf',null)],'チャカつき');
 assert.deepEqual([pair.observed,pair.n,pair.placedPercentage,pair.other,pair.dnf],[2,1,100,0,1]);
});
test('auto: scratched is excluded from a real pair denominator',()=>{
 const [pair]=combinations([row('finished',4),row('scratched',null)],'チャカつき');
 assert.deepEqual([pair.observed,pair.n,pair.placedPercentage,pair.other,pair.scratched],[2,1,0,1,1]);
});
test('auto: excluded-only observation keeps its pair card with no rates',()=>{
 const rows=[row('dnf',null),row('scratched',null)];const [pair]=combinations(rows,'チャカつき');
 assert.deepEqual([pair.observed,pair.n,pair.dnf,pair.scratched,pair.placedPercentage],[2,0,1,1,null]);
 const {t,el}=screen(rows);t.renderConditionSummaryResult();const html=el('conditionCombinationResult').innerHTML;
 assert.ok(html.includes('<article '));assert.ok(html.includes('n=0頭（完走）'));assert.ok(html.includes('競走中止 1頭'));assert.ok(html.includes('出走取消 1頭'));
 assert.equal(html.includes('%'),false);
});
test('auto: no co-occurrence shows a single empty message, not theoretical cards',()=>{
 const rows=[row('finished',1,false),{...row('finished',3),chaka:false}];
 assert.deepEqual(combinations(rows,'チャカつき'),[]);
 const {t,el}=screen(rows);t.renderConditionSummaryResult();assert.equal(el('conditionCombinationResult').innerHTML,'<p class="condition-none">組み合わせデータなし</p>');
});
test('auto: state button switches the full pair list without another request',async()=>{
 const rows=[row('finished',1),{...row('finished',4,false),awkward_gait:true},
   {...row('dnf',null),chaka:false,awkward_gait:true}];
 const {t,el,events}=screen(rows);t.renderConditionSummaryResult();let html=el('conditionCombinationResult').innerHTML;
 assert.ok(html.includes('チャカつき × 発汗・強'));assert.ok(html.includes('チャカつき × ぎこちない歩様'));
 await events.click({target:{closest:()=>({dataset:{summaryCondition:'ぎこちない歩様'}})}});
 html=el('conditionCombinationResult').innerHTML;assert.ok(html.includes('ぎこちない歩様 × チャカつき'));assert.ok(html.includes('ぎこちない歩様 × 発汗・強'));
 assert.equal(html.includes('チャカつき × 発汗・強'),false);assert.ok(html.includes('n=0頭（完走）'));assert.ok(html.includes('競走中止 1頭'));
 assert.equal(combinations(rows,'ぎこちない歩様').every(x=>choices.includes(x.otherState)),true);
});
