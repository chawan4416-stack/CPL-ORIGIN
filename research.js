(() => {
 'use strict';
 const ref='kczisspagwqzdvaeemir', config=window.CPL_BETA_CONFIG;
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const valid=config?.projectRef===ref && config.url===`https://${ref}.supabase.co` &&
   /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'');
 if(!valid||!window.supabase){$('auth').innerHTML='<p>開発環境の設定を確認できません。</p>';return;}
 const db=window.supabase.createClient(config.url,config.publishableKey,
   {auth:{storageKey:`cpl-dev-${ref}-all-runner-beta-auth`}});
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const blankRace=()=>({race_date:today(),racecourse:'',race_number:'1',surface:'',distance:'',course:'',track_condition:'',field_size:'',race_class:''});
 const newHorse=(rank=1)=>({popularity:'',finish_position:String(rank),chest:'',hindquarter:'',tone:''});
 function orderHorses(horses){const rows=[...horses].sort((a,b)=>Number(a.finish_position)-Number(b.finish_position));
   for(const rank of ['1','2','3'])if(!rows.some(x=>x.finish_position===rank)){
     const at=rows.findIndex(x=>Number(x.finish_position)>Number(rank));
     rows.splice(at<0?rows.length:at,0,newHorse(Number(rank)));}
   return rows;}
 const blankCondition=()=>({id:null,outcome_status:'finished',finish_position:'',popularity:'',chaka:false,awkward_gait:false,agitation:null,sweating:null,fast_walking:false});
 const state={user:null,masters:{},sRace:blankRace(),cRace:blankRace(),sRaceExpanded:true,sRaceStage:'steps',sRaceStep:0,sRaceEditing:false,cRaceStage:'steps',cRaceStep:0,cRaceEditing:false,horses:[newHorse(1),newHorse(2),newHorse(3)],current:0,
   condition:blankCondition(),filter:{},merge:false,view:'suitability',records:[]};
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
 let raceStepTimer;
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
   clearTimeout(raceStepTimer);
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
   const control=key==='race_date'?`<input type="date" id="${prefix}StepInput" data-race="${mode}" data-key="${key}" value="${esc(r[key])}">`:
     autoCourse?`<div class="suit-auto-value">${esc(r.course)}</div><p class="suit-auto-note">自動判定 ✓</p>`:
     `<select id="${prefix}StepInput" data-race="${mode}" data-key="${key}">${opts(options[key],r[key])}</select>`;
   $(m.root).innerHTML=`<div class="card suit-step-card"><p class="suit-progress">${state[m.step]+1} / 9</p>
     <label class="suit-step-label" for="${prefix}StepInput">${esc(label)}</label><div class="suit-step-control">${control}</div>
     <div class="suit-step-actions">${state[m.step]>0?`<button type="button" class="suit-step-back" data-race-back="${mode}">← 戻る</button>`:'<span></span>'}
     ${(key==='race_date'||(r[key]&&!autoCourse))?`<button type="button" class="suit-step-next" data-race-next="${mode}">${state[m.step]===8?'確認へ →':'次へ →'}</button>`:''}</div></div>`;
   if(autoCourse)raceStepTimer=setTimeout(()=>{if(state[m.stage]==='steps'&&state[m.step]===4)moveRaceStep(mode);},700);
 }
 const renderSuitRace=()=>renderFocusRace('s');
 function renderRaces(){syncRace(state.sRace,'s');syncRace(state.cRace,'c');renderFocusRace('s');renderFocusRace('c');
   renderHorse();renderConditionResult();}
 function choice(group,value,label,current){return `<button type="button" class="choice${current===value?' active':''}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${current===value}">${esc(label)}</button>`;}
 function renderHorse(){const h=state.horses[state.current],tabs=$('horseTabs'),previousScroll=tabs.scrollLeft;
   tabs.innerHTML=state.horses.map((x,i)=>{const complete=!!(x.popularity&&x.chest&&x.hindquarter&&x.tone);
     const progress=x.popularity?`${esc(x.popularity)}人気${complete?' ✓':'・入力中'}`:
       x.legacy_horse_number?`旧馬番 ${esc(x.legacy_horse_number)}`:
       (x.chest||x.hindquarter||x.tone?'入力中':'未選択');
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
      ${h.legacy_horse_number&&!h.popularity?`<p class="help">旧記録の馬番は${esc(h.legacy_horse_number)}番です。保存する際は公式の人気を選択してください。</p>`:''}
      <div class="group"><strong>胸前</strong><div class="focus-choices chest-choices">${values('SUITABILITY','CHEST').map(v=>choice('chest',v,v,h.chest)).join('')}</div></div>
      <div class="group"><strong>トモ</strong><div class="hind-choices">${[['シャープ−','シャープ'],['厚−','厚'],['重厚−','重厚']].map(pair=>
        `<div class="hind-pair">${pair.map(v=>choice('hindquarter',v,v,h.hindquarter)).join('')}</div>`).join('')}</div></div>
      <div class="group"><strong>ハリ</strong><div class="focus-choices tone-choices">${values('SUITABILITY','TONE').map(v=>choice('tone',v,v,h.tone)).join('')}</div></div>
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
 const draftKey=()=>`CPL_DEV_${ref}_RESEARCH_V1_${state.user?.id}`;
 function draft(){if(!state.user)return;try{localStorage.setItem(draftKey(),JSON.stringify({version:1,sRace:state.sRace,sRaceExpanded:state.sRaceExpanded,
   sRaceStage:state.sRaceStage,sRaceStep:state.sRaceStep,sRaceEditing:state.sRaceEditing,cRace:state.cRace,
   cRaceStage:state.cRaceStage,cRaceStep:state.cRaceStep,cRaceEditing:state.cRaceEditing,
   horses:state.horses,current:state.current,condition:state.condition,view:state.view,filter:state.filter,merge:state.merge,scrollY:scrollY}));}catch{notice('下書きを保存できませんでした。');}}
 function restore(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d?.version!==1)return;
   const saved=d.condition||{},legacy=['placed','finished_other'].includes(saved.outcome_status);
   Object.assign(state,{sRace:d.sRace||blankRace(),cRace:d.cRace||blankRace(),horses:d.horses||[newHorse()],
      current:d.current||0,condition:legacy?blankCondition():Object.fromEntries(Object.keys(blankCondition()).map(k=>[k,saved[k]??blankCondition()[k]])),
      view:d.view||'suitability',filter:d.filter||{},merge:!!d.merge});
   state.cRaceStage=['steps','summary','edit-list','horses'].includes(d.cRaceStage)?d.cRaceStage:'steps';
   state.cRaceStep=Number.isInteger(d.cRaceStep)?Math.max(0,Math.min(8,d.cRaceStep)):Math.max(0,firstMissingStep('c'));
   state.cRaceEditing=!!d.cRaceEditing;
   state.horses=state.horses.map(h=>h.popularity!==undefined?h:{...h,legacy_horse_number:h.horse_number||'',popularity:''});
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
       ['chest','胸前','[data-group="chest"]'],
       ['hindquarter','トモ','[data-group="hindquarter"]'],['tone','ハリ','[data-group="tone"]']])
       if(!h[key])invalid(`${label}の「${name}」が未入力です。`,selector,i);}
   const seen=new Map();for(let i=0;i<state.horses.length;i++){const h=state.horses[i],first=seen.get(h.popularity);
     if(first!==undefined)invalid(`${h.popularity}番人気が重複しています（${first+1}頭目と${i+1}頭目）。`,`[data-horse-field="popularity"]`,i);
     seen.set(h.popularity,i);}
   if(!state.horses.some(h=>Number(h.finish_position)===1))
     invalid('1着馬がいません。1着のタブから入力してください。','[data-horse-tab="0"]',0);
   const rows=state.horses.map(h=>({popularity:Number(h.popularity),finish_position:Number(h.finish_position),
     chest:h.chest,hindquarter:h.hindquarter,tone:h.tone}));
   $('saveSuitability').disabled=true;await checked(db.rpc('save_suitability_research',{p_race:state.sRace,p_horses:rows}));
   state.horses=[newHorse(1),newHorse(2),newHorse(3)];state.current=0;renderHorse();draft();notice('適性研究を保存しました。',true);
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
 function filterHTML(){const f=state.filter;return [['racecourse','競馬場',values('RACE','RACECOURSE')],
   ['surface','芝・ダート',values('RACE','SURFACE')],['course','コース形態',[...new Set(Object.entries(state.masters)
     .filter(([k])=>k.startsWith('COURSE:')||k.startsWith('COURSE_DISTANCE:')).flatMap(([,a])=>a.map(x=>x.option_value)))]],
   ['distance','距離',[...new Set(Object.keys(state.masters).filter(k=>k.startsWith('COURSE_DISTANCE:')).map(k=>k.split(':').at(-1)))].sort((a,b)=>Number(a)-Number(b))],
   ['track_condition','馬場',values('RACE','TRACK_CONDITION')]].map(([key,label,items])=>
     `<label>${label}<select data-filter="${key}">${opts(items,f[key],'すべて')}</select></label>`).join('');}
 async function summary(){try{const [rows,conditions]=await Promise.all([
   checked(db.rpc('research_suitability_distribution',{p_filter:state.filter,p_merge:state.merge})),
   checked(db.rpc('research_condition_summary',{p_filter:state.filter}))]);
   $('merge').textContent=state.merge?'統合 18通り':'詳細 24通り';$('sample').textContent=`母数：${rows[0]?.total||0}頭`;
   const chests=state.merge?['シャープ','厚','重厚']:['シャープ','厚−','厚','重厚'];
   const hind=['シャープ−','シャープ','厚−','厚','重厚−','重厚'];
   $('matrix').innerHTML=`<div class="matrix-row"><span></span>${hind.map(v=>`<span class="matrix-head">${v}</span>`).join('')}</div>`+
     chests.map(chest=>`<div class="matrix-row"><b class="label">胸前 ${chest}</b>${hind.map(h=>{const r=rows.find(x=>x.chest===chest&&x.hindquarter===h);
       return `<button data-combo="${esc(chest)}|${esc(h)}" data-count="${r?.observations||0}" style="background:${r?.observations?'#dbe9d9':''}">${r?.observations||0}件<br>${r?.percentage||0}%</button>`;}).join('')}</div>`).join('');
   $('toneBreakdown').textContent='組み合わせを選ぶとハリの内訳を表示します。';
   $('matrix').onclick=e=>{const b=e.target.closest('[data-combo]');if(!b)return;const [ch,h]=b.dataset.combo.split('|');
     const r=rows.find(x=>x.chest===ch&&x.hindquarter===h);const t=r?.tone_breakdown||{};
     $('toneBreakdown').textContent=`胸前 ${ch} × トモ ${h}：${r?.observations||0}件／${r?.percentage||0}%　ハリ：パンパン ${t['パンパン']||0}・普通 ${t['普通']||0}・ゴム感 ${t['ゴム感']||0}・未観察 ${t['未観察']||0}`;};
   $('conditionSummary').innerHTML=conditions.length?conditions.map(c=>`<div class="result-row"><b>${esc(c.condition_key)}</b>　${c.recorded}件<br>1〜3着 ${c.placed}／着外 ${c.other_finish}／中止 ${c.dnf}／取消 ${c.scratched}</div>`).join(''):'対象の状態記録はありません。';
 }catch(e){notice(`集計できませんでした：${e.message}`)}}
 async function records(){try{const [races,suits,conditions]=await Promise.all([
   checked(db.from('races').select('id,race_date,racecourse,race_number,surface,distance,course,track_condition,field_size,race_class').order('race_date',{ascending:false}).limit(100)),
   checked(db.from('suitability_observations').select('race_id,horse_number,popularity,finish_position,chest,hindquarter,tone')),
   checked(db.from('condition_observations').select('id,race_id,outcome_status,finish_position,popularity,chaka,awkward_gait,agitation,sweating,fast_walking'))]);
   state.records=races.map(r=>({...r,suitability:suits.filter(s=>s.race_id===r.id),conditions:conditions.filter(c=>c.race_id===r.id)}));
   $('recordsList').innerHTML=state.records.filter(r=>r.suitability.length||r.conditions.length).map(r=>
     `<div class="card"><b>${r.race_date} ${esc(r.racecourse)} ${r.race_number}R</b><p>${esc(r.surface)} ${r.distance}m ${esc(r.course)}</p>
       <p>適性 ${r.suitability.length}頭／状態 ${r.conditions.length}頭</p>
       ${r.suitability.length?`<button data-open-suit="${r.id}">適性を開く</button>`:''}
       ${r.conditions.map(c=>`<button data-open-condition="${r.id}" data-observation-id="${c.id}">状態 ${c.outcome_status==='finished'?c.finish_position+'着':c.outcome_status==='dnf'?'競走中止':'出走取消'}${c.popularity?'・'+c.popularity+'人気':''}を開く</button>`).join('')}</div>`).join('')||'<div class="card">研究記録はありません。</div>';
 }catch(e){notice(`記録を読めませんでした：${e.message}`)}}
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
   if(b.dataset.view){show(b.dataset.view);if(state.view==='summary')await summary();if(state.view==='records')await records();}
   else if(b.dataset.horseTab!==undefined){state.current=Number(b.dataset.horseTab);renderHorse();draft();}
   else if(b.dataset.raceBack){const m=raceMode(b.dataset.raceBack);clearTimeout(raceStepTimer);state[m.step]=Math.max(0,state[m.step]-1);renderFocusRace(b.dataset.raceBack);draft();}
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
   else if(b.dataset.group){state.horses[state.current][b.dataset.group]=b.dataset.value;renderHorse();draft();}
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
     state.horses=orderHorses(r.suitability.map(x=>({popularity:x.popularity?String(x.popularity):'',legacy_horse_number:x.horse_number?String(x.horse_number):'',finish_position:String(x.finish_position),
       chest:x.chest,hindquarter:x.hindquarter,tone:x.tone||''})));
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
     if(mode==='s'){
       if(old!==el.value&&['racecourse','surface','distance'].includes(el.dataset.key))r.course='';
       if(['racecourse','surface','distance'].includes(el.dataset.key))syncRace(r,'s');
       if(el.dataset.key==='field_size')renderHorse();
     }else{
       if(old!==el.value&&['racecourse','surface','distance'].includes(el.dataset.key))r.course='';
       if(['racecourse','surface','distance'].includes(el.dataset.key))syncRace(r,'c');
       if(el.dataset.key==='field_size')renderConditionResult();
     }
     draft();clearTimeout(raceStepTimer);
     if(el.dataset.key!=='race_date'&&el.value){const at=state[m.step];
       raceStepTimer=setTimeout(()=>{if(state[m.stage]==='steps'&&state[m.step]===at)moveRaceStep(mode);},180);}}
   else if(el.dataset.filter){if(el.value)state.filter[el.dataset.filter]=el.value;else delete state.filter[el.dataset.filter];draft();await summary();}
 });
 $('addHorse').onclick=()=>{if(state.horses.length>=18)return notice('最大18頭です。');
   const rank=state.horses[state.current].finish_position;
   let at=state.current+1;while(at<state.horses.length&&state.horses[at].finish_position===rank)at++;
   state.horses.splice(at,0,newHorse(Number(rank)));state.current=at;renderHorse();draft();};
 $('saveSuitability').onclick=saveSuitability;$('saveCondition').onclick=saveCondition;
 $('merge').onclick=async()=>{state.merge=!state.merge;draft();await summary();};
 $('login').onclick=async()=>{const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}${location.pathname}`}});if(error)notice(error.message);};
 $('logout').onclick=async()=>{await db.auth.signOut();};
 $('messageDismiss').onclick=()=>{clearTimeout(noticeTimer);$('message').hidden=true;};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)draft();});window.addEventListener('pagehide',draft);
 let initialized=false;
 async function auth(session){if(session?.user){if(initialized&&state.user?.id===session.user.id)return;
   state.user=session.user;initialized=true;try{await loadMasters();restore();renderRaces();renderChoices();$('filters').innerHTML=filterHTML();
     $('auth').hidden=true;$('workspace').hidden=false;show(state.view);if(state.view==='summary')await summary();if(state.view==='records')await records();
   }catch(e){notice(`初期化できませんでした：${e.message}`)}}else{state.user=null;initialized=false;$('auth').hidden=false;$('workspace').hidden=true;}}
 db.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED')return;setTimeout(()=>auth(session),0);});
 db.auth.getSession().then(({data})=>auth(data.session));
})();
