const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function screen(rows){
 const els=new Map();
 const el=id=>{if(!els.has(id))els.set(id,{innerHTML:'',textContent:'',hidden:false,disabled:false,
  style:{setProperty(){},removeProperty(){}},setAttribute(){},querySelectorAll(){return []},classList:{toggle(){}}});return els.get(id)};
 const db={auth:{onAuthStateChange(){},getSession:()=>new Promise(()=>{})}};
 const context={console,Date,Math,Number,String,JSON,Map,Set,Promise,setTimeout,clearTimeout,
  localStorage:{setItem(){},getItem(){return null}},
  window:{CPL_BETA_CONFIG:{projectRef:'kczisspagwqzdvaeemir',url:'https://kczisspagwqzdvaeemir.supabase.co',publishableKey:'sb_publishable_test'},
   CPLSuitabilitySummary:require('../suitability-summary.js'),CPLConditionSummary:require('../condition-summary.js'),
   supabase:{createClient:()=>db},addEventListener(){},scrollTo(){}},
  document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('figure'),addEventListener(){}},
  location:{origin:'https://local.test',pathname:'/research.html'},requestAnimationFrame:f=>f()};
 const source=fs.readFileSync(path.join(root,'research.js'),'utf8').replace(/\}\)\(\);\s*$/,
  'window.__test={state,renderConditionSummaryResult,renderCombination,setRows:r=>{conditionRows=r;conditionLoaded=true},unload:()=>{conditionLoaded=false}};})();');
 vm.runInNewContext(source,context);
 const t=context.window.__test;t.state.summaryCondition='チャカつき';t.state.conditionExtra='発汗・強';
 t.state.masters={RACE_CLASS:[{category:'RACE_CLASS',option_value:'G1'}]};t.setRows(rows);
 return {t,el};
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
 assert.ok(html.includes(`n=${n}頭（完走）`));assert.equal(html.includes('集計対象外'),!!(dnf||scratched));
 if(!n){assert.ok(html.includes('該当データなし'));assert.equal(html.includes('0.0%'),false);}
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
