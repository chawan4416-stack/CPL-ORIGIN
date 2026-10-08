/* State research summary Ver.1.0: embedded to preserve the 13-file Pages artifact. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CPLConditionSummary=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const choices=['チャカつき','ぎこちない歩様','早歩き','イレ込み・あり','イレ込み・強','発汗・あり','発汗・強'];
  const popularityBands=[{label:'1～3人気',min:1,max:3},{label:'4～6人気',min:4,max:6},{label:'7人気以下',min:7,max:18}];
  const classOrder=['未勝利','1勝クラス','2勝クラス','3勝クラス','リステッド','オープン','G3','G2','G1'];
  const classNames=masters=>{
    const active=new Set(masters.filter(row=>row.category==='RACE_CLASS').map(row=>row.option_value));
    return classOrder.filter(name=>active.has(name));
  };
  const has=(row,key)=>({
    'チャカつき':()=>row.chaka===true,
    'ぎこちない歩様':()=>row.awkward_gait===true,
    '早歩き':()=>row.fast_walking===true,
    'イレ込み・あり':()=>row.agitation==='あり',
    'イレ込み・強':()=>row.agitation==='強',
    '発汗・あり':()=>row.sweating==='あり',
    '発汗・強':()=>row.sweating==='強'
  })[key]?.()===true;
  const finished=row=>row.outcome_status==='finished'&&Number.isInteger(Number(row.finish_position))&&Number(row.finish_position)>=1;
  const rate=(placed,n)=>n?Math.round(placed/n*1000)/10:null;
  function summarize(rows,keys){
    const selected=rows.filter(row=>keys.every(key=>has(row,key)));
    const complete=selected.filter(finished);
    const placed=complete.filter(row=>Number(row.finish_position)<=3).length;
    const n=complete.length;
    return {n,placed,other:n-placed,placedPercentage:rate(placed,n),otherPercentage:rate(n-placed,n),
      dnf:selected.filter(row=>row.outcome_status==='dnf').length,
      scratched:selected.filter(row=>row.outcome_status==='scratched').length};
  }
  function analyze(rows,key,classValues){
    const matching=rows.filter(row=>has(row,key));
    return {key,total:matching.length,overall:summarize(matching,[]),
      popularity:popularityBands.map(band=>({label:band.label,...summarize(matching.filter(row=>
        Number(row.popularity)>=band.min&&Number(row.popularity)<=band.max),[])})),
      classes:classValues.map(label=>({label,...summarize(matching.filter(row=>row.races?.race_class===label),[])}))};
  }
  function combinations(rows,key){
    const matching=rows.filter(row=>has(row,key));
    return choices.filter(other=>other!==key).flatMap(other=>{
      const observed=matching.filter(row=>has(row,other));
      return observed.length?[{key,otherState:other,observed:observed.length,...summarize(observed,[])}]:[];
    });
  }
  return Object.freeze({choices,popularityBands,classNames,has,summarize,analyze,combinations});
});

/* End embedded state summary module. */
(() => {
 'use strict';
 const ref='ekgislctkribtztazvsd', config={url:window.CPL_SUPABASE_URL,publishableKey:window.CPL_SUPABASE_KEY,projectRef:ref};
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const valid=config?.projectRef===ref && config.url===`https://${ref}.supabase.co` &&
   /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'');
 if(!valid||!window.supabase){$('auth').innerHTML='<p>正式環境の設定を確認できません。</p>';return;}
 const db=window.supabase.createClient(config.url,config.publishableKey,
   {auth:{storageKey:`cpl-web-${ref}-research-v1-auth`}});
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const blankRace=()=>({race_date:today(),racecourse:'',race_number:'1',surface:'',distance:'',course:'',track_condition:'',field_size:'',race_class:''});
 const newHorse=(rank=1)=>({popularity:'',finish_position:String(rank),chest:'',hindquarter:'',hindquarter_density:null,hindquarter_texture:null});
 function orderHorses(horses){const rows=[...horses].sort((a,b)=>Number(a.finish_position)-Number(b.finish_position));
   for(const rank of ['1','2','3'])if(!rows.some(x=>x.finish_position===rank)){
     const at=rows.findIndex(x=>Number(x.finish_position)>Number(rank));
     rows.splice(at<0?rows.length:at,0,newHorse(Number(rank)));}
   return rows;}
 const blankCondition=()=>({id:null,outcome_status:'finished',finish_position:'',popularity:'',chaka:false,awkward_gait:false,agitation:null,sweating:null,fast_walking:false});
 const state={user:null,masters:{},sRace:blankRace(),cRace:blankRace(),sRaceExpanded:true,sRaceStage:'steps',sRaceStep:0,sRaceEditing:false,cRaceStage:'steps',cRaceStep:0,cRaceEditing:false,horses:[newHorse(1),newHorse(2),newHorse(3)],current:0,
   condition:blankCondition(),filter:{},view:'suitability',records:[],
   summaryMode:'suitability',summaryCondition:'チャカつき',suitabilityAdvanced:{race_class:'',popularity:''},suitabilityAppliedFilter:null,suitabilityInitialTried:false};
 const suitabilityFields=[['race_date','開催日'],['racecourse','競馬場'],['race_number','レース'],
   ['surface','芝・ダート'],['distance','距離'],['course','コース形態'],
   ['track_condition','馬場状態'],['field_size','頭数'],['race_class','競走条件']];
 const suitSteps=[['race_date','開催日'],['racecourse','競馬場'],['surface','芝・ダート'],
   ['distance','距離'],['course','コース形態'],['track_condition','馬場状態'],
   ['race_number','レース'],['field_size','頭数'],['race_class','クラス']];
 const raceComplete=r=>suitabilityFields.every(([key])=>!!r[key])&&r.race_class!=='新馬';
 const opts=(values,selected,placeholder='選択')=>`<option value="">${placeholder}</option>`+values.map(v=>`<option value="${esc(v)}"${String(v)===String(selected)?' selected':''}>${esc(v)}</option>`).join('');
 const values=(category,key)=>(state.masters[`${category}:${key}`]||[]).map(x=>x.option_value);
 const distances=r=>{const prefix=`COURSE_DISTANCE:${r.racecourse}:${r.surface}:`;
   const d=Object.keys(state.masters).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length));
   return [...new Set(d.length?d:values('DISTANCE',r.racecourse))].sort((a,b)=>Number(a)-Number(b));};
 const courses=r=>values('COURSE_DISTANCE',`${r.racecourse}:${r.surface}:${r.distance}`).length?
   values('COURSE_DISTANCE',`${r.racecourse}:${r.surface}:${r.distance}`):values('COURSE',r.racecourse);
 function syncRace(r,mode='c'){const ds=distances(r);if(!ds.includes(String(r.distance)))r.distance=ds[0]||'';
   const cs=courses(r);if(!cs.includes(r.course))r.course=cs.length===1?cs[0]:'';
   const cls=values('RACE_CLASS',r.racecourse).filter(v=>v!=='新馬');
   if(!cls.includes(r.race_class))r.race_class='';}
 const raceStepTimer={s:null,c:null};
 const raceMode=mode=>mode==='s'?{race:'sRace',stage:'sRaceStage',step:'sRaceStep',editing:'sRaceEditing',root:'suitRace',work:'suitHorseWork'}:
   {race:'cRace',stage:'cRaceStage',step:'cRaceStep',editing:'cRaceEditing',root:'conditionRace',work:'conditionWork'};
 const firstMissingStep=mode=>{const m=raceMode(mode),r=state[m.race];return suitSteps.findIndex(([key])=>!r[key]||(key==='race_class'&&r[key]==='新馬'));};
 function moveRaceStep(mode){
   const m=raceMode(mode),missing=firstMissingStep(mode);
   if(state[m.editing]){state[m.editing]=false;if(missing<0)state[m.stage]='summary';else state[m.step]=missing;}
   else if(missing>=0&&missing<=state[m.step])state[m.step]=missing;
   else if(state[m.step]<8)state[m.step]=missing>=0?Math.min(state[m.step]+1,missing):state[m.step]+1;
   else if(missing>=0)state[m.step]=missing;
   else{state[m.stage]='summary';state[m.editing]=false;}
   renderFocusRace(mode);draft();
 }
 function renderFocusRace(mode){
   clearTimeout(raceStepTimer[mode]);
   const m=raceMode(mode),r=state[m.race],complete=raceComplete(r),prefix=mode==='s'?'suit':'condition';
   if(!complete&&state[m.stage]!=='steps'){state[m.stage]='steps';state[m.step]=Math.max(0,firstMissingStep(mode));state[m.editing]=false;}
   const stage=state[m.stage];
   $(m.work).hidden=stage!=='horses';
   if(stage==='horses'){
     $(m.root).innerHTML=`<div class="card race-compact"><div class="race-summary"><div><strong>${esc(r.racecourse)}・${esc(r.surface)}${esc(r.distance)}m・${esc(r.track_condition)}・${esc(r.race_number)}R</strong></div><button type="button" data-race-summary="${mode}">変更</button></div></div>`;
     return;
   }
   if(stage==='summary'&&complete){
     $(m.root).innerHTML=`<div class="card suit-step-card suit-review"><p class="suit-progress">レース情報の確認</p>
       <div class="suit-review-values"><strong>${esc(r.race_date.replaceAll('-','/'))}</strong><strong>${esc(r.racecourse)}・${esc(r.surface)}${esc(r.distance)}m</strong>
       <span>${esc(r.course)}・${esc(r.track_condition)}</span><span>${esc(r.race_number)}R・${esc(r.field_size)}頭</span><span>${esc(r.race_class)}</span></div>
       <button type="button" class="suit-edit-button" data-race-edit-list="${mode}">変更する</button>
       <button type="button" class="suit-step-next" data-race-work="${mode}">${mode==='s'?'馬体':'状態'}入力へ →</button></div>`;
     return;
   }
   if(stage==='edit-list'&&complete){
     $(m.root).innerHTML=`<div class="card suit-step-card"><p class="suit-progress">変更する項目を選択</p><div class="suit-edit-list">${suitSteps.map(([key,label],i)=>
       `<button type="button" data-race-edit="${mode}:${i}"><span>${esc(label)}</span><strong>${esc(key==='race_date'?r[key].replaceAll('-','/'):r[key]+(key==='race_number'?'R':key==='field_size'?'頭':key==='distance'?'m':''))}</strong></button>`).join('')}</div>
       <button type="button" class="suit-step-back" data-race-summary="${mode}">← 確認へ戻る</button></div>`;
     return;
   }
   state[m.stage]='steps';state[m.step]=Math.max(0,Math.min(8,state[m.step]));
   const [key,label]=suitSteps[state[m.step]];
   const options={racecourse:values('RACE','RACECOURSE'),surface:values('RACE','SURFACE'),distance:distances(r),course:courses(r),
     track_condition:values('RACE','TRACK_CONDITION'),race_number:Array.from({length:12},(_,i)=>String(i+1)),
     field_size:Array.from({length:18},(_,i)=>String(i+1)),race_class:values('RACE_CLASS',r.racecourse).filter(v=>v!=='新馬')};
   const autoCourse=key==='course'&&options.course.length===1&&r.course===options.course[0];
   const control=key==='race_date'?`<div class="focus-date-field"><span data-date-value aria-hidden="true">${esc(r[key]?r[key].replaceAll('-','/'):'選択')}</span><input type="date" id="${prefix}StepInput" data-race="${mode}" data-key="${key}" value="${esc(r[key])}"></div>`:
     autoCourse?`<div class="suit-auto-value">${esc(r.course)}</div><p class="suit-auto-note">自動判定 ✓</p>`:
     `<select id="${prefix}StepInput" data-race="${mode}" data-key="${key}">${opts(options[key],r[key])}</select>`;
   $(m.root).innerHTML=`<div class="card suit-step-card"><p class="suit-progress">${state[m.step]+1} / 9</p>
     <label class="suit-step-label" for="${prefix}StepInput">${esc(label)}</label><div class="suit-step-control">${control}</div>
     <div class="suit-step-actions">${state[m.step]>0?`<button type="button" class="suit-step-back" data-race-back="${mode}">← 戻る</button>`:'<span></span>'}
     ${(key==='race_date'||(r[key]&&!autoCourse))?`<button type="button" class="suit-step-next" data-race-next="${mode}">${state[m.step]===8?'確認へ →':'次へ →'}</button>`:''}</div></div>`;
   if(autoCourse)raceStepTimer[mode]=setTimeout(()=>{if(state[m.stage]==='steps'&&state[m.step]===4)moveRaceStep(mode);},700);
 }
 const renderSuitRace=()=>renderFocusRace('s');
 function renderRaces(){syncRace(state.sRace,'s');syncRace(state.cRace,'c');renderFocusRace('s');renderFocusRace('c');
   renderHorse();renderConditionResult();}
 function choice(group,value,label,current){return `<button type="button" class="choice${current===value?' active':''}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${current===value}">${esc(label)}</button>`;}
 function renderHorse(){const h=state.horses[state.current],tabs=$('horseTabs'),previousScroll=tabs.scrollLeft;
   tabs.innerHTML=state.horses.map((x,i)=>{const complete=summaryTools.complete(x);
     const progress=x.popularity?`${esc(x.popularity)}人気${complete?' ✓':'・入力中'}`:
       (x.chest||x.hindquarter||x.hindquarter_density||x.hindquarter_texture?'入力中':'未選択');
     return `<button type="button" data-horse-tab="${i}" data-complete="${complete}" class="${state.current===i?'active':''}" aria-current="${state.current===i?'true':'false'}"><span>${esc(x.finish_position)}着</span><small>${progress}</small></button>`;}).join('');
   tabs.scrollLeft=previousScroll;
   const selected=tabs.children[state.current];
   if(selected){if(selected.offsetLeft<tabs.scrollLeft)tabs.scrollLeft=selected.offsetLeft;
     else if(selected.offsetLeft+selected.offsetWidth>tabs.scrollLeft+tabs.clientWidth)
       tabs.scrollLeft=selected.offsetLeft+selected.offsetWidth-tabs.clientWidth;}
   const numbers=Array.from({length:Number(state.sRace.field_size)||18},(_,i)=>String(i+1));
   $('horseEditor').innerHTML=`<div class="rank-popularity">
      <strong id="popularityLabel">人気</strong><div class="popularity-grid" role="group" aria-labelledby="popularityLabel">${numbers.map(n=>
        `<button type="button" data-horse-field="popularity" data-value="${n}" class="popularity-choice${h.popularity===n?' active':''}" aria-label="${n}人気" aria-pressed="${h.popularity===n}">${n}</button>`).join('')}</div></div>
      <div class="group"><strong>胸前形状</strong><div class="focus-choices shape-choices">${values('SUITABILITY','CHEST').map(v=>choice('chest',v,v,h.chest)).join('')}</div></div>
      <div class="group"><strong>トモ形状</strong><div class="focus-choices shape-choices">${values('SUITABILITY','HINDQUARTER').map(v=>choice('hindquarter',v,v,h.hindquarter)).join('')}</div></div>
      <div class="group tomo-axis"><strong>トモ密度</strong><div class="focus-choices density-choices">${values('SUITABILITY','HINDQUARTER_DENSITY').map(v=>choice('hindquarter_density',v,v,h.hindquarter_density)).join('')}</div><p class="help">充足：評価範囲全体が筋肉で満たされ、目立つ隙間や薄い部分がない。未充足は低評価を意味しません。</p></div>
      <div class="group tomo-axis"><strong>トモ質感</strong><div class="focus-choices texture-choices">${values('SUITABILITY','HINDQUARTER_TEXTURE').map(v=>choice('hindquarter_texture',v,v,h.hindquarter_texture?.split('＋').includes(v)?v:null)).join('')}</div><p class="help">張りあり：静止時に表面が張って見える。弾力あり：歩行時に筋肉がしなやかに動く。両方選択できます。</p></div>
      ${state.horses.filter(x=>x.finish_position===h.finish_position).length>1?'<button type="button" data-remove-horse class="secondary">この同着馬を外す</button>':''}`;}
 const conditionChoices=[['chaka','チャカつき'],['awkward_gait','ぎこちない歩様'],['agitation:あり','イレ込み・あり'],
   ['agitation:強','イレ込み・強'],['sweating:あり','発汗・あり'],['sweating:強','発汗・強'],['fast_walking','早歩き']];
 function renderChoices(){$('conditionChoices').innerHTML=conditionChoices.map(([key,label])=>{const [field,value]=key.split(':');
   const on=value?state.condition[field]===value:state.condition[field]===true;
   return `<button type="button" class="choice${on?' active':''}" data-condition="${key}" aria-pressed="${on}">${label}</button>`;}).join('');}
 function numberGrid(field,label,selected,size){
   return `<div class="condition-group"><strong id="condition-${field}-label">${label}</strong><div class="popularity-grid" role="group" aria-labelledby="condition-${field}-label">${Array.from({length:size},(_,i)=>String(i+1)).map(n=>
     `<button type="button" data-condition-number="${field}" data-value="${n}" class="popularity-choice${selected===n?' active':''}" aria-label="${n}${label}" aria-pressed="${selected===n}">${n}</button>`).join('')}</div></div>`;}
 function renderConditionResult(){const c=state.condition,size=Number(state.cRace.field_size)||18;
   $('conditionResult').innerHTML=`<div class="condition-result">
     <div class="condition-status" role="group" aria-label="結果区分">
       ${[['finished','完走'],['dnf','競走中止'],['scratched','出走取消']].map(([v,label])=>
         `<button type="button" data-condition-status="${v}" class="${c.outcome_status===v?'active':''}" aria-pressed="${c.outcome_status===v}">${label}</button>`).join('')}</div>
     ${c.outcome_status==='finished'?numberGrid('finish_position','着順',c.finish_position,size):''}
     ${c.outcome_status!=='scratched'?numberGrid('popularity','人気',c.popularity,size):''}
     </div>`;}
 const legacyDraftKey=()=>`CPL_DEV_${ref}_RESEARCH_V1_${state.user?.id}`;
 const draftKey=()=>`CPL_WEB_${ref}_RESEARCH_V1_FORMAL_20260929_${state.user?.id}`;
 function draft(){if(!state.user)return;try{localStorage.setItem(draftKey(),JSON.stringify({version:1,suitabilityVersion:2,sRace:state.sRace,sRaceExpanded:state.sRaceExpanded,
   sRaceStage:state.sRaceStage,sRaceStep:state.sRaceStep,sRaceEditing:state.sRaceEditing,cRace:state.cRace,
   cRaceStage:state.cRaceStage,cRaceStep:state.cRaceStep,cRaceEditing:state.cRaceEditing,
   horses:state.horses,current:state.current,condition:state.condition,view:state.view,filter:state.filter,
   summaryMode:state.summaryMode,summaryCondition:state.summaryCondition,suitabilityAdvanced:state.suitabilityAdvanced,
   suitabilityAppliedFilter:state.suitabilityAppliedFilter,suitabilityInitialTried:state.suitabilityInitialTried,scrollY:scrollY}));}catch{notice('下書きを保存できませんでした。');}}
 function restore(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d?.version!==1)return;
   const saved=d.condition||{},legacy=['placed','finished_other'].includes(saved.outcome_status);
   Object.assign(state,{sRace:d.sRace||blankRace(),cRace:d.cRace||blankRace(),horses:d.horses||[newHorse()],
      current:d.current||0,condition:legacy?blankCondition():Object.fromEntries(Object.keys(blankCondition()).map(k=>[k,saved[k]??blankCondition()[k]])),
      view:d.view||'suitability',filter:d.filter||{},
      summaryMode:d.summaryMode==='condition'?'condition':'suitability',
      summaryCondition:conditionChoices.some(([,label])=>label===d.summaryCondition)?d.summaryCondition:'チャカつき',
      suitabilityAdvanced:{race_class:d.suitabilityAdvanced?.race_class||'',popularity:d.suitabilityAdvanced?.popularity||''},
      suitabilityAppliedFilter:d.suitabilityAppliedFilter||null,suitabilityInitialTried:!!d.suitabilityInitialTried});
   state.cRaceStage=['steps','summary','edit-list','horses'].includes(d.cRaceStage)?d.cRaceStage:'steps';
   state.cRaceStep=Number.isInteger(d.cRaceStep)?Math.max(0,Math.min(8,d.cRaceStep)):Math.max(0,firstMissingStep('c'));
   state.cRaceEditing=!!d.cRaceEditing;
   if(d.suitabilityVersion!==2){state.horses=[newHorse(1),newHorse(2),newHorse(3)];state.current=0;state.suitabilityAppliedFilter=null;state.suitabilityInitialTried=false;}
   const selected=state.horses[state.current];state.horses=orderHorses(state.horses);
   state.current=Math.max(0,state.horses.indexOf(selected));
   state.sRaceExpanded=typeof d.sRaceExpanded==='boolean'?d.sRaceExpanded:!raceComplete(state.sRace);
   state.sRaceStage=['steps','summary','edit-list','horses'].includes(d.sRaceStage)?d.sRaceStage:
     (raceComplete(state.sRace)&&!state.sRaceExpanded?'horses':'steps');
   state.sRaceStep=Number.isInteger(d.sRaceStep)?Math.max(0,Math.min(8,d.sRaceStep)):Math.max(0,firstMissingStep('s'));
   state.sRaceEditing=!!d.sRaceEditing;
   state.current=Math.min(state.current,state.horses.length-1);
   setTimeout(()=>window.scrollTo(0,d.scrollY||0),100);}catch{}}
 let noticeTimer;
 function notice(message,ok=false){const box=$('message');clearTimeout(noticeTimer);
   $('messageText').textContent=message;box.classList.toggle('ok',ok);box.hidden=!message;
   if(ok)noticeTimer=setTimeout(()=>{box.hidden=true;},6000);}
 async function checked(promise){const {data,error}=await promise;if(error)throw error;return data;}
 async function loadMasters(){const rows=await checked(db.from('master_options').select('category,field_key,option_value,sort_order').eq('active',true).order('sort_order'));
   for(const row of rows)(state.masters[`${row.category}:${row.field_key}`]||=[]).push(row);}
 function show(view){state.view=view;document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==view);
   document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));draft();}
 function invalid(message,selector,horseIndex){if(horseIndex!==undefined){state.current=horseIndex;renderHorse();draft();}
   const target=document.querySelector(selector);if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'center'}));
   throw Error(message);}
 function validRace(r,mode){const missing=suitabilityFields.find(([key])=>!r[key]||(key==='race_class'&&r[key]==='新馬'));if(missing){
   const m=raceMode(mode);state[m.stage]='steps';state[m.step]=Math.max(0,suitSteps.findIndex(([key])=>key===missing[0]));state[m.editing]=false;renderFocusRace(mode);
   invalid(`レース情報「${missing[1]}」が未入力です。`,`[data-race="${mode}"][data-key="${missing[0]}"]`);}}
 async function saveSuitability(){try{validRace(state.sRace,'s');
   for(let i=0;i<state.horses.length;i++){const h=state.horses[i],label=`${h.finish_position||'?'}着${h.popularity?`・${h.popularity}番人気`:''}`;
     for(const [key,name,selector] of [['popularity','人気','[data-horse-field="popularity"]'],
       ['chest','胸前形状','[data-group="chest"]'],
       ['hindquarter','トモ形状','[data-group="hindquarter"]'],['hindquarter_density','トモ密度','[data-group="hindquarter_density"]'],['hindquarter_texture','トモ質感','[data-group="hindquarter_texture"]']])
       if(!h[key])invalid(`${label}の「${name}」が未入力です。`,selector,i);}
   const seen=new Map();for(let i=0;i<state.horses.length;i++){const h=state.horses[i],first=seen.get(h.popularity);
     if(first!==undefined)invalid(`${h.popularity}番人気が重複しています（${first+1}頭目と${i+1}頭目）。`,`[data-horse-field="popularity"]`,i);
     seen.set(h.popularity,i);}
   if(!state.horses.some(h=>Number(h.finish_position)===1))
     invalid('1着馬がいません。1着のタブから入力してください。','[data-horse-tab="0"]',0);
   const rows=state.horses.map(h=>({popularity:Number(h.popularity),finish_position:Number(h.finish_position),
     chest:h.chest,hindquarter:h.hindquarter,hindquarter_density:h.hindquarter_density,hindquarter_texture:h.hindquarter_texture}));
   $('saveSuitability').disabled=true;await checked(db.rpc('save_suitability_research',{p_race:state.sRace,p_horses:rows}));
   state.sRace=blankRace();state.sRaceExpanded=true;state.sRaceStage='steps';state.sRaceStep=0;state.sRaceEditing=false;
   state.horses=[newHorse(1),newHorse(2),newHorse(3)];state.current=0;
   renderFocusRace('s');renderHorse();window.scrollTo(0,0);draft();notice('適性研究を保存しました。',true);
 }catch(e){notice(`保存できませんでした：${e.message}`)}finally{$('saveSuitability').disabled=false;}}
 async function saveCondition(){try{validRace(state.cRace,'c');const c=state.condition,size=Number(state.cRace.field_size);
   if(!conditionChoices.some(([k])=>{const [f,v]=k.split(':');return v?c[f]===v:c[f]===true;}))
     invalid('気になった状態を1つ以上選んでください。','#conditionChoices');
   if(c.outcome_status==='finished'&&(!c.finish_position||Number(c.finish_position)>size))
     invalid('公式着順を選択してください。','[data-condition-number="finish_position"]');
   if(c.outcome_status!=='scratched'&&(!c.popularity||Number(c.popularity)>size))
     invalid('人気を選択してください。','[data-condition-number="popularity"]');
   $('saveCondition').disabled=true;
   await checked(db.rpc('save_condition_research',{p_race:state.cRace,p_horse:{...c,
      finish_position:c.outcome_status==='finished'?Number(c.finish_position):null,
      popularity:c.outcome_status==='scratched'?null:Number(c.popularity)}}));
   state.condition=blankCondition();renderChoices();renderConditionResult();draft();notice('状態と公式結果を保存しました。',true);
 }catch(e){notice(`保存できませんでした：${e.message}`)}finally{$('saveCondition').disabled=false;}}
 const summaryTools=window.CPLSuitabilitySummary;
 const summaryKeys=['racecourse','surface','distance','course','track_condition'];
 let summaryRequest=0,summaryRows=[],detailRequest=0,detailRows=[],summaryBusy=false,summaryError='';
 let rankingFinish=3,detailRankings=null;
 const summaryPending=()=>!summaryTools.sameFilters(state.filter,state.suitabilityAppliedFilter);
 function summaryControls(){const pending=summaryPending(),button=$('runSuitabilitySummary');
   button.disabled=summaryBusy||!summaryTools.ready(state.filter);
   button.textContent=summaryBusy?'集計中…':'この条件で集計';
   button.classList.toggle('changed',pending&&!summaryBusy&&summaryTools.ready(state.filter));
   $('summaryVisual').classList.toggle('pending',pending||summaryBusy);
   $('topCombos').classList.toggle('pending',pending||summaryBusy);
   $('topComboList').querySelectorAll('button').forEach(b=>b.disabled=pending||summaryBusy);
   $('detailsToggle').disabled=pending||summaryBusy;
   if(pending||summaryBusy){++detailRequest;$('summaryDetails').hidden=true;$('detailsToggle').setAttribute('aria-expanded','false');$('detailsToggle').firstChild.textContent='詳細を見る ';}
 }
 function syncSummaryFilters(){const f=state.filter;
   if(!values('RACE','RACECOURSE').includes(f.racecourse))delete f.racecourse;
   if(!values('RACE','SURFACE').includes(f.surface))delete f.surface;
   if(!f.racecourse||!f.surface||!distances(f).includes(String(f.distance)))delete f.distance;
   if(!f.distance)delete f.course;
   else{const list=courses(f);if(list.length===1)f.course=list[0];else if(!list.includes(f.course))delete f.course;}
   if(!values('RACE','TRACK_CONDITION').includes(f.track_condition))delete f.track_condition;
 }
 function filterHTML(){const f=state.filter;return [
   ['racecourse','競馬場',values('RACE','RACECOURSE')],['surface','芝・ダート',values('RACE','SURFACE')],
   ['distance','距離',f.racecourse&&f.surface?distances(f):[]],
   ['course','コース形態',f.distance?courses(f):[]],
   ['track_condition','馬場状態',values('RACE','TRACK_CONDITION')]
 ].map(([key,label,items])=>`<label>${label}<select data-filter="${key}" aria-label="${label}" ${!items.length||summaryBusy?'disabled':''} required>${opts(items,f[key])}</select></label>`).join('');}
 function summaryChoice(index){const item=summaryTools.summarize(summaryRows).top[index];if(!item)return;
   const art=$('horseArt');art.style.setProperty('--chest-color',summaryTools.colors[item.chest]);
   art.style.setProperty('--hind-color',summaryTools.colors[item.hindquarter]);
   art.setAttribute('aria-label',`胸前 ${item.chest}、トモ ${item.hindquarter}`);
   $('chestValue').textContent=item.chest;$('hindValue').textContent=item.hindquarter;
   document.querySelectorAll('#topComboList .combo-row').forEach((button,i)=>{
     button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
 }
 function renderSuitabilityRanking(){
   const titles={1:'勝ち馬',2:'連対馬',3:'複勝圏馬'};
   $('suitabilityRankingTabs').innerHTML=Object.entries(titles).map(([finish,title])=>
     `<button type="button" data-suitability-ranking="${finish}" aria-pressed="${Number(finish)===rankingFinish}" class="${Number(finish)===rankingFinish?'active':''}">${title}</button>`).join('');
   $('suitabilityRankingTitle').textContent=`${titles[rankingFinish]}：公式${rankingFinish===1?'1着':`1〜${rankingFinish}着`}`;
   const result=detailRankings?.[rankingFinish];
   const renderAxis=(title,rows)=>`<h3>${title}</h3>`+rows.map(row=>
     `<div class="result-row"><strong>${row.rank===null?'—':row.rank}位　${esc(row.label)}</strong><span>${row.count}頭 / n=${result.n}　${row.percentage===null?'—':row.percentage.toFixed(1)+'%'}</span><progress class="ranking-bar" value="${row.count}" max="${result.n||1}" aria-label="${esc(row.label)}の構成比：${row.percentage===null?'該当データなし':row.percentage.toFixed(1)+'%'}"></progress></div>`).join('');
   $('suitabilityRankingResult').innerHTML=!result?'':(!result.n?'<p>該当データなし</p>':'')+
     renderAxis('トモ密度ランキング',result.density)+renderAxis('トモ質感ランキング',result.texture);

 }
 function renderSummaryDetail(){const {chestOrder,hindOrder}=summaryTools;
   const {n}=summaryTools.summarize(detailRows);
   $('suitabilityDetailSample').textContent=`n = ${n}頭`;
   if(!n){$('matrix').textContent='該当データなし';$('suitabilityDensityDetail').replaceChildren();$('suitabilityTextureDetail').replaceChildren();return;}
   $('matrix').innerHTML=`<div class="matrix-row"><span></span>${hindOrder.map(v=>`<span class="matrix-head">${esc(v)}</span>`).join('')}</div>`+
     chestOrder.map(chest=>`<div class="matrix-row"><b class="label">${esc(chest)}</b>${hindOrder.map(hind=>{
       const row=detailRows.find(x=>x.chest===chest&&x.hindquarter===hind);
       return `<button type="button" disabled data-count="${Number(row?.observations||0)}">${Number(row?.observations||0)}頭<br>${Number(row?.percentage||0).toFixed(1)}%</button>`;}).join('')}</div>`).join('');
   for(const [id,labels,key] of [['suitabilityDensityDetail',summaryTools.densityOrder,'density_breakdown'],['suitabilityTextureDetail',summaryTools.textureOrder,'texture_breakdown']])
     $(id).innerHTML=labels.map(label=>{const count=detailRows.reduce((sum,row)=>sum+Number(row[key]?.[label]||0),0);
       return `<div class="result-row">${label}　${count}頭 / ${n}頭　${(count/n*100).toFixed(1)}%</div>`;}).join('');
 }
 function renderSuitabilityAdvanced(){const selected=state.suitabilityAdvanced;
   const classes=values('RACE_CLASS',state.suitabilityAppliedFilter?.racecourse).filter(v=>v!=='新馬');
   if(selected.race_class&&!classes.includes(selected.race_class))selected.race_class='';
   $('suitabilityClassFilter').innerHTML=opts(classes,selected.race_class,'すべて');
   $('suitabilityPopularityFilter').innerHTML=opts(Array.from({length:18},(_,i)=>String(i+1)),selected.popularity,'すべて');
 }
 async function loadSuitabilityDetail(){if(summaryPending()||summaryBusy)return;const token=++detailRequest,f={...state.suitabilityAppliedFilter},advanced={...state.suitabilityAdvanced};
   detailRankings=null;renderSuitabilityRanking();
   $('suitabilityDetailSample').textContent='集計中…';$('matrix').replaceChildren();$('suitabilityDensityDetail').replaceChildren();$('suitabilityTextureDetail').replaceChildren();
   if(!summaryKeys.every(key=>!!f[key]))return;
   try{const observations=[];let offset=0;const pageSize=500;
     for(;;){let query=db.from('suitability_observations')
       .select('id,finish_position,chest,hindquarter,hindquarter_density,hindquarter_texture,popularity,races!inner(racecourse,surface,distance,course,track_condition,race_class)')
       .gte('finish_position',1).lte('finish_position',3)
       .eq('races.racecourse',f.racecourse).eq('races.surface',f.surface)
       .eq('races.distance',Number(f.distance)).eq('races.course',f.course)
       .eq('races.track_condition',f.track_condition).order('id').range(offset,offset+pageSize-1);
       if(advanced.race_class)query=query.eq('races.race_class',advanced.race_class);
       if(advanced.popularity)query=query.eq('popularity',Number(advanced.popularity));
       const page=await checked(query);if(token!==detailRequest||state.summaryMode!=='suitability')return;
       observations.push(...page);if(page.length<pageSize)break;offset+=pageSize;
     }
     detailRankings=Object.fromEntries([1,2,3].map(finish=>[finish,summaryTools.rankObservations(observations,finish)]));
     renderSuitabilityRanking();detailRows=summaryTools.fromObservations(observations);renderSummaryDetail();
   }catch(e){if(token===detailRequest){$('suitabilityDetailSample').textContent='詳細を取得できませんでした';notice(`適性の詳細を取得できませんでした：${e.message}`);}}
 }
 function paintSuitabilitySummary(){const f=state.suitabilityAppliedFilter,{n,top}=summaryTools.summarize(summaryRows);
   document.querySelector('#suitabilitySummaryPanel .summary-figure-card').classList.toggle('has-result',!!n);
   $('summaryTitle').textContent=f?`${f.racecourse}　${f.surface}${f.distance}m　${f.course}　${f.track_condition}`:'適性研究データ';
   $('sample').textContent=f?`適性研究 1〜3着　n = ${n}頭`:'';
   $('summaryVisual').hidden=!n;$('topCombos').hidden=!n;$('detailsToggle').hidden=!n;
   $('summaryDetails').hidden=true;$('detailsToggle').setAttribute('aria-expanded','false');$('detailsToggle').firstChild.textContent='詳細を見る ';
   $('summaryEmpty').textContent=summaryError|| (f?'該当データなし':'5つの条件を選択');$('summaryEmpty').hidden=!!n;
   $('topComboList').innerHTML=top.map((item,i)=>`<button type="button" class="combo-row" data-summary-choice="${i}" aria-pressed="false">
       <span class="combo-rank">${i+1}位</span><span class="combo-values"><span class="combo-chip" data-eval="${esc(item.chest)}"><small>胸前</small>${esc(item.chest)}</span><span class="combo-times">×</span>
       <span class="combo-chip" data-eval="${esc(item.hindquarter)}"><small>トモ</small>${esc(item.hindquarter)}</span></span>
       <span class="combo-count"><b>${item.count}頭</b>${item.percentage.toFixed(1)}%</span></button>`).join('');
   if(n)summaryChoice(0);
   else{const art=$('horseArt');art.style.removeProperty('--chest-color');art.style.removeProperty('--hind-color');art.setAttribute('aria-label','該当データなし');$('chestValue').textContent='';$('hindValue').textContent='';}
   summaryControls();
 }
 async function suitabilitySummary(reload=false){
   if(summaryBusy||!reload&&!summaryTools.ready(state.filter))return;
   const candidate=summaryTools.snapshot(reload?state.suitabilityAppliedFilter:state.filter);
   if(!summaryTools.ready(candidate))return;
   const token=++summaryRequest;summaryBusy=true;summaryError='';summaryControls();$('filters').innerHTML=filterHTML();
   if(!state.suitabilityAppliedFilter){$('summaryEmpty').textContent='集計中…';$('summaryEmpty').hidden=false;}
   try{const rows=await checked(db.rpc('research_suitability_distribution',{p_filter:candidate}));
     if(token!==summaryRequest||state.summaryMode!=='suitability')return;
     ++detailRequest;detailRows=[];detailRankings=null;summaryRows=rows;state.suitabilityAppliedFilter=candidate;
   }catch(e){if(token===summaryRequest){summaryError='集計を取得できませんでした';notice(`集計できませんでした：${e.message}`);}}
   finally{if(token===summaryRequest){summaryBusy=false;paintSuitabilitySummary();$('filters').innerHTML=filterHTML();draft();}}
 }
 const conditionTools=window.CPLConditionSummary;
 let conditionRequest=0,conditionRows=[],conditionBusy=false,conditionLoaded=false,conditionError='';
 const conditionClasses=()=>conditionTools.classNames(Object.values(state.masters).flat());
 const conditionPct=result=>result.n?`${result.placedPercentage.toFixed(1)}%`:'—';
 const conditionExcludedText=result=>[
   result.dnf?`競走中止 ${result.dnf}頭`:'',result.scratched?`出走取消 ${result.scratched}頭`:''
 ].filter(Boolean).join(' / ');
 function renderConditionSummaryChoices(){
   $('summaryConditionChoices').innerHTML=conditionTools.choices.map(label=>
     `<button type="button" data-summary-condition="${esc(label)}" class="${state.summaryCondition===label?'active':''}" aria-pressed="${state.summaryCondition===label}">${esc(label)}</button>`).join('');
 }
 function renderConditionSummaryResult(){
   const ready=conditionLoaded,result=conditionTools.analyze(conditionRows,state.summaryCondition,conditionClasses());
   $('conditionSelectedName').textContent=`${state.summaryCondition} の成績`;
   $('conditionSample').textContent=ready?`n=${result.overall.n}頭（完走）`:'';
   const excluded=ready?conditionExcludedText(result.overall):'';
   $('conditionExcluded').textContent=excluded?`集計対象外：${excluded}`:'';
   $('conditionExcluded').hidden=!excluded;
   $('conditionSummaryEmpty').textContent=conditionError||(ready?'該当データなし':'集計中…');
   $('conditionSummaryEmpty').hidden=ready&&result.overall.n>0;
   $('conditionMetrics').hidden=!ready||!result.overall.n;
   if(result.overall.n){$('conditionPlaced').textContent=conditionPct(result.overall);$('conditionOther').textContent=`${result.overall.otherPercentage.toFixed(1)}%`;
     $('conditionPlacedCount').textContent=`${result.overall.placed}頭 / ${result.overall.n}頭`;
     $('conditionOtherCount').textContent=`${result.overall.other}頭 / ${result.overall.n}頭`;}
   $('conditionPopularity').hidden=!ready;
   $('conditionClasses').hidden=!ready;
   $('conditionCombination').hidden=!ready;
   $('conditionPopularityList').innerHTML=result.popularity.map(band=>`<div class="condition-stat"><strong>${esc(band.label)}</strong><b>${conditionPct(band)}</b><span>${band.n?`${band.placed} / ${band.n}頭`:'n=0　該当データなし'}</span></div>`).join('');
   $('conditionClassList').innerHTML=result.classes.map(item=>`<div class="condition-stat"><strong>${esc(item.label)}</strong><b>${conditionPct(item)}</b><span>${item.n?`${item.placed} / ${item.n}頭`:'n=0　該当データなし'}</span></div>`).join('');
   renderCombination();
 }
 async function conditionSummary(){
   if(conditionBusy)return;
   const token=++conditionRequest;conditionBusy=true;conditionLoaded=false;conditionRows=[];conditionError='';
   renderConditionSummaryResult();
   try{const rows=[];let offset=0;const size=500;
     for(;;){const page=await checked(db.from('condition_observations')
       .select('id,chaka,awkward_gait,fast_walking,agitation,sweating,outcome_status,finish_position,popularity,races!inner(race_class)')
       .order('id').range(offset,offset+size-1));
       if(token!==conditionRequest||state.summaryMode!=='condition')return;
       rows.push(...page);if(page.length<size)break;offset+=size;
     }
     conditionRows=rows;conditionLoaded=true;
   }catch(e){if(token===conditionRequest){conditionRows=[];conditionLoaded=false;conditionError='集計を取得できませんでした';notice(`状態集計を取得できませんでした：${e.message}`);}}
   finally{if(token===conditionRequest){conditionBusy=false;renderConditionSummaryResult();draft();}}
 }
 function renderCombination(){
   const ready=conditionLoaded&&!conditionBusy;
   $('conditionCombinationResult').hidden=!ready;
   if(!ready){$('conditionCombinationResult').innerHTML='';return;}
   const combinations=conditionTools.combinations(conditionRows,state.summaryCondition);
   $('conditionCombinationResult').innerHTML=combinations.map(result=>{
     const name=[result.key,result.otherState].map(esc).join(' × '),excluded=conditionExcludedText(result);
     return `<article class="condition-combination-card"><h3>${name} <small>n=${result.n}頭（完走）</small></h3>${result.n?
     `<div class="condition-metrics"><div class="condition-metric"><small>複勝圏（1～3着）</small><b>${result.placedPercentage.toFixed(1)}%</b><span>${result.placed}頭 / ${result.n}頭</span></div><div class="condition-metric"><small>着外（4着以下）</small><b>${result.otherPercentage.toFixed(1)}%</b><span>${result.other}頭 / ${result.n}頭</span></div></div>`:
     '<p class="condition-none">該当データなし　n=0</p>'}${excluded?`<p class="condition-excluded">集計対象外：${esc(excluded)}</p>`:''}</article>`;
   }).join('')||'<p class="condition-none">組み合わせデータなし</p>';
 }
 async function summary(){
   $('summary').classList.toggle('suitability-summary-view',state.summaryMode==='suitability');
   $('summary').classList.toggle('condition-summary-view',state.summaryMode==='condition');
   $('filters').hidden=state.summaryMode==='condition';
   document.querySelectorAll('[data-summary-mode]').forEach(b=>{const selected=b.dataset.summaryMode===state.summaryMode;
     b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
   $('suitabilitySummaryPanel').hidden=state.summaryMode!=='suitability';
   $('conditionSummaryPanel').hidden=state.summaryMode!=='condition';
   if(state.summaryMode==='condition'){
     ++summaryRequest;++detailRequest;summaryBusy=false;
     renderConditionSummaryChoices();
     await conditionSummary();
   }else{++conditionRequest;conditionBusy=false;paintSuitabilitySummary();
     if(state.suitabilityAppliedFilter)await suitabilitySummary(true);
     else if(!state.suitabilityInitialTried){state.suitabilityInitialTried=true;draft();
       if(summaryTools.ready(state.filter))await suitabilitySummary();}}
 }
 async function records(){try{const [races,suits,conditions]=await Promise.all([
   checked(db.from('races').select('id,race_date,racecourse,race_number,surface,distance,course,track_condition,field_size,race_class').order('race_date',{ascending:false}).limit(100)),
   checked(db.from('suitability_observations').select('race_id,popularity,finish_position,chest,hindquarter,hindquarter_density,hindquarter_texture')),
   checked(db.from('condition_observations').select('id,race_id,outcome_status,finish_position,popularity,chaka,awkward_gait,agitation,sweating,fast_walking'))]);
   state.records=races.map(r=>({...r,suitability:suits.filter(s=>s.race_id===r.id),conditions:conditions.filter(c=>c.race_id===r.id)}));
   $('recordsList').innerHTML=state.records.filter(r=>r.suitability.length||r.conditions.length).map(r=>
     `<div class="card"><b>${r.race_date} ${esc(r.racecourse)} ${r.race_number}R</b><p>${esc(r.surface)} ${r.distance}m ${esc(r.course)}</p>
       <p>適性 ${r.suitability.length}頭／状態 ${r.conditions.length}頭</p>
       ${r.suitability.length?`<button data-open-suit="${r.id}">適性を開く</button>`:''}
       ${r.conditions.map(c=>`<button data-open-condition="${r.id}" data-observation-id="${c.id}">状態 ${c.outcome_status==='finished'?c.finish_position+'着':c.outcome_status==='dnf'?'競走中止':'出走取消'}${c.popularity?'・'+c.popularity+'人気':''}を開く</button>`).join('')}</div>`).join('')||'<div class="card">研究記録はありません。</div>';
 }catch(e){notice(`記録を読めませんでした：${e.message}`)}}
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
   if(b.dataset.view){show(b.dataset.view);if(state.view==='summary'){window.scrollTo(0,0);await summary();}if(state.view==='records')await records();}
   else if(b.dataset.openSummary){state.summaryMode=b.dataset.openSummary;show('summary');window.scrollTo(0,0);await summary();}
   else if(b.dataset.summaryMode){if(state.summaryMode===b.dataset.summaryMode)return;state.summaryMode=b.dataset.summaryMode;draft();await summary();}
   else if(b.dataset.suitabilityRanking){rankingFinish=Number(b.dataset.suitabilityRanking);renderSuitabilityRanking();}
   else if(b.dataset.summaryCondition){state.summaryCondition=b.dataset.summaryCondition;renderConditionSummaryChoices();renderConditionSummaryResult();draft();}
   else if(b.dataset.horseTab!==undefined){state.current=Number(b.dataset.horseTab);renderHorse();draft();}
   else if(b.dataset.raceBack){const mode=b.dataset.raceBack,m=raceMode(mode);clearTimeout(raceStepTimer[mode]);state[m.step]=Math.max(0,state[m.step]-1);renderFocusRace(mode);draft();}
   else if(b.dataset.raceNext){const mode=b.dataset.raceNext,m=raceMode(mode),[key,label]=suitSteps[state[m.step]];
     if(!state[m.race][key])return notice(`「${label}」を入力してください。`);
     moveRaceStep(mode);}
   else if(b.dataset.raceSummary){const mode=b.dataset.raceSummary,m=raceMode(mode);state[m.stage]='summary';state[m.editing]=false;renderFocusRace(mode);draft();}
   else if(b.dataset.raceEditList){const mode=b.dataset.raceEditList,m=raceMode(mode);state[m.stage]='edit-list';renderFocusRace(mode);draft();}
   else if(b.dataset.raceEdit){const [mode,step]=b.dataset.raceEdit.split(':'),m=raceMode(mode);state[m.stage]='steps';state[m.step]=Number(step);state[m.editing]=true;renderFocusRace(mode);draft();}
   else if(b.dataset.raceWork){const mode=b.dataset.raceWork,m=raceMode(mode);if(!raceComplete(state[m.race])){
     const missing=Math.max(0,firstMissingStep(mode));state[m.stage]='steps';state[m.step]=missing;renderFocusRace(mode);draft();
     return notice(`「${suitSteps[missing][1]}」を入力してください。`);}
     state[m.stage]='horses';state[m.editing]=false;renderFocusRace(mode);draft();window.scrollTo(0,0);}
   else if(b.dataset.horseField==='popularity'){state.horses[state.current].popularity=b.dataset.value;renderHorse();draft();}
   else if(b.dataset.group){const h=state.horses[state.current];h[b.dataset.group]=b.dataset.group==='hindquarter_texture'?summaryTools.toggleTexture(h.hindquarter_texture,b.dataset.value):b.dataset.value;renderHorse();draft();}
   else if(b.dataset.condition){const [field,value]=b.dataset.condition.split(':');state.condition[field]=value?
     (state.condition[field]===value?null:value):!state.condition[field];renderChoices();draft();}
   else if(b.dataset.conditionNumber){state.condition[b.dataset.conditionNumber]=b.dataset.value;renderConditionResult();draft();}
   else if(b.dataset.conditionStatus){state.condition.outcome_status=b.dataset.conditionStatus;
     if(b.dataset.conditionStatus!=='finished')state.condition.finish_position='';
     if(b.dataset.conditionStatus==='scratched')state.condition.popularity='';
     renderConditionResult();draft();}
   else if(b.dataset.openSuit){const r=state.records.find(x=>x.id===b.dataset.openSuit);if(!r)return;
     state.sRace={race_date:r.race_date,racecourse:r.racecourse,race_number:String(r.race_number),surface:r.surface,
       distance:String(r.distance),course:r.course,track_condition:r.track_condition,field_size:String(r.field_size),race_class:r.race_class||''};
     state.horses=orderHorses(r.suitability.map(x=>({popularity:x.popularity?String(x.popularity):'',finish_position:String(x.finish_position),
       chest:x.chest,hindquarter:x.hindquarter,hindquarter_density:x.hindquarter_density,hindquarter_texture:x.hindquarter_texture})));
     state.current=0;state.sRaceStage='horses';state.sRaceEditing=false;state.sRaceExpanded=false;renderRaces();show('suitability');window.scrollTo(0,0);}
   else if(b.dataset.openCondition){const r=state.records.find(x=>x.id===b.dataset.openCondition);
     const c=r?.conditions.find(x=>x.id===b.dataset.observationId);if(!c)return;
     state.cRace={race_date:r.race_date,racecourse:r.racecourse,race_number:String(r.race_number),surface:r.surface,
       distance:String(r.distance),course:r.course,track_condition:r.track_condition,field_size:String(r.field_size),race_class:r.race_class||''};
     state.condition={...blankCondition(),id:c.id,outcome_status:c.outcome_status,finish_position:c.finish_position?String(c.finish_position):'',
       chaka:c.chaka,awkward_gait:c.awkward_gait,fast_walking:c.fast_walking,
       popularity:c.popularity?String(c.popularity):'',agitation:c.agitation||null,sweating:c.sweating||null};
     state.cRaceStage='horses';state.cRaceEditing=false;renderRaces();renderChoices();show('condition');window.scrollTo(0,0);}
   else if(b.dataset.removeHorse!==undefined){state.horses.splice(state.current,1);state.current=Math.max(0,state.current-1);renderHorse();draft();}
 });
 document.addEventListener('change',async e=>{const el=e.target;
   if(el.dataset.race){const mode=el.dataset.race,m=raceMode(mode),r=state[m.race],old=r[el.dataset.key];r[el.dataset.key]=el.value;
     if(el.dataset.key==='race_date'){const visible=el.parentElement.querySelector('[data-date-value]');if(visible)visible.textContent=el.value?el.value.replaceAll('-','/'):'選択';}
     if(mode==='s'){
       if(old!==el.value&&['racecourse','surface','distance'].includes(el.dataset.key))r.course='';
       if(['racecourse','surface','distance'].includes(el.dataset.key))syncRace(r,'s');
       if(el.dataset.key==='field_size')renderHorse();
     }else{
       if(old!==el.value&&['racecourse','surface','distance'].includes(el.dataset.key))r.course='';
       if(['racecourse','surface','distance'].includes(el.dataset.key))syncRace(r,'c');
       if(el.dataset.key==='field_size')renderConditionResult();
     }
     draft();clearTimeout(raceStepTimer[mode]);
     if(el.dataset.key!=='race_date'&&el.value){const at=state[m.step];
       raceStepTimer[mode]=setTimeout(()=>{if(state[m.stage]==='steps'&&state[m.step]===at)moveRaceStep(mode);},180);}}
   else if(el.dataset.filter){const key=el.dataset.filter,previous=state.filter[key];
     if(el.value)state.filter[key]=el.value;else delete state.filter[key];
     if(previous!==el.value&&['racecourse','surface','distance'].includes(key))delete state.filter.course;
     if(previous!==el.value)state.suitabilityAdvanced={race_class:'',popularity:''};
     syncSummaryFilters();$('filters').innerHTML=filterHTML();draft();
     summaryControls();}
   else if(el.id==='suitabilityClassFilter'||el.id==='suitabilityPopularityFilter'){
     state.suitabilityAdvanced[el.id==='suitabilityClassFilter'?'race_class':'popularity']=el.value;
     draft();await loadSuitabilityDetail();}
 });
 $('addHorse').onclick=()=>{if(state.horses.length>=18)return notice('最大18頭です。');
   const rank=state.horses[state.current].finish_position;
   let at=state.current+1;while(at<state.horses.length&&state.horses[at].finish_position===rank)at++;
   state.horses.splice(at,0,newHorse(Number(rank)));state.current=at;renderHorse();draft();};
 $('saveSuitability').onclick=saveSuitability;$('saveCondition').onclick=saveCondition;
 $('runSuitabilitySummary').onclick=()=>suitabilitySummary();
 $('topComboList').onclick=e=>{if(summaryPending()||summaryBusy)return;const button=e.target.closest('[data-summary-choice]');if(button)summaryChoice(Number(button.dataset.summaryChoice));};
 $('detailsToggle').onclick=async()=>{if(summaryPending()||summaryBusy)return;const opening=$('summaryDetails').hidden;
   $('summaryDetails').hidden=!opening;$('detailsToggle').setAttribute('aria-expanded',String(opening));
   $('detailsToggle').firstChild.textContent=opening?'詳細を閉じる ':'詳細を見る ';
   if(opening){renderSuitabilityAdvanced();await loadSuitabilityDetail();}else ++detailRequest;};
 $('login').onclick=async()=>{const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('./',location.href).href}});if(error)notice(error.message);};
 $('logout').onclick=async()=>{await db.auth.signOut();};
 $('messageDismiss').onclick=()=>{clearTimeout(noticeTimer);$('message').hidden=true;};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)draft();});window.addEventListener('pagehide',draft);
 let initialized=false;
 async function auth(session){if(session?.user){if(initialized&&state.user?.id===session.user.id)return;
   state.user=session.user;initialized=true;try{localStorage.removeItem(legacyDraftKey());}catch{}
   try{await loadMasters();restore();renderRaces();renderChoices();syncSummaryFilters();$('filters').innerHTML=filterHTML();
     $('auth').hidden=true;$('workspace').hidden=false;show(state.view);if(state.view==='summary')await summary();if(state.view==='records')await records();
   }catch(e){notice(`初期化できませんでした：${e.message}`)}}else{state.user=null;initialized=false;$('auth').hidden=false;$('workspace').hidden=true;}}
 db.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED')return;setTimeout(()=>auth(session),0);});
 db.auth.getSession().then(({data})=>auth(data.session));
})();
