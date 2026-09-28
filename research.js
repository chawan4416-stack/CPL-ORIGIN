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
 const blankCondition=()=>({horse_number:'',outcome_status:'placed',finish_position:'1',popularity:'',chaka:false,awkward_gait:false,agitation:null,sweating:null,fast_walking:false});
 const state={user:null,masters:{},sRace:blankRace(),cRace:blankRace(),sRaceExpanded:true,horses:[newHorse(1),newHorse(2),newHorse(3)],current:0,
   condition:blankCondition(),filter:{},merge:false,view:'suitability',records:[]};
 const fields=[['race_date','開催日'],['racecourse','競馬場'],['race_number','レース'],['surface','芝・ダート'],
   ['distance','距離'],['course','コース形態'],['track_condition','馬場状態'],['field_size','頭数']];
 const raceComplete=r=>fields.every(([key])=>!!r[key]);
 const opts=(values,selected,placeholder='選択')=>`<option value="">${placeholder}</option>`+values.map(v=>`<option value="${esc(v)}"${String(v)===String(selected)?' selected':''}>${esc(v)}</option>`).join('');
 const values=(category,key)=>(state.masters[`${category}:${key}`]||[]).map(x=>x.option_value);
 const distances=r=>{const prefix=`COURSE_DISTANCE:${r.racecourse}:${r.surface}:`;
   const d=Object.keys(state.masters).filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length));
   return [...new Set(d.length?d:values('DISTANCE',r.racecourse))].sort((a,b)=>Number(a)-Number(b));};
 const courses=r=>values('COURSE_DISTANCE',`${r.racecourse}:${r.surface}:${r.distance}`).length?
   values('COURSE_DISTANCE',`${r.racecourse}:${r.surface}:${r.distance}`):values('COURSE',r.racecourse);
 function syncRace(r){const ds=distances(r);if(!ds.includes(String(r.distance)))r.distance=ds[0]||'';
   const cs=courses(r);if(!cs.includes(r.course))r.course=cs.length===1?cs[0]:'';
   const cls=values('RACE_CLASS',r.racecourse);if(!cls.includes(r.race_class))r.race_class='';}
 function raceHTML(r,mode){const selections={racecourse:values('RACE','RACECOURSE'),race_number:Array.from({length:12},(_,i)=>String(i+1)),
   surface:values('RACE','SURFACE'),distance:distances(r),course:courses(r),track_condition:values('RACE','TRACK_CONDITION'),
   field_size:Array.from({length:18},(_,i)=>String(i+1))};
   const classValues=values('RACE_CLASS',r.racecourse);
   return `<div class="card"><h2>レース情報</h2><div class="fields">${fields.map(([key,label])=>`<label>${label}${key==='race_date'?
    `<input type="date" data-race="${mode}" data-key="${key}" value="${esc(r[key])}">`:
    `<select data-race="${mode}" data-key="${key}">${opts(selections[key],r[key])}</select>`}</label>`).join('')}
    ${classValues.length?`<label>競走条件（任意）<select data-race="${mode}" data-key="race_class">${opts(classValues,r.race_class)}</select></label>`:''}</div></div>`;}
 function renderSuitRace(){const r=state.sRace,complete=raceComplete(r);
   if(!complete)state.sRaceExpanded=true;
   if(complete&&!state.sRaceExpanded){
     const date=r.race_date.split('-');
     const courseLabel={'内回り':'内','外回り':'外'}[r.course]||r.course;
     $('suitRace').innerHTML=`<div class="card race-compact"><div class="race-summary">
       <div><strong>${esc(Number(date[1]))}/${esc(Number(date[2]))}　${esc(r.racecourse)}${esc(r.race_number)}R</strong>
       <span>${esc(r.surface)}${esc(r.distance)}m・${esc(courseLabel)}｜${esc(r.track_condition)}｜${esc(r.field_size)}頭</span></div>
       <button type="button" data-race-toggle="open">変更</button></div></div>`;
   }else{
     $('suitRace').innerHTML=raceHTML(r,'s')+
       (complete?'<button type="button" class="race-collapse" data-race-toggle="close">レース情報を閉じる</button>':'');
   }}
 function renderRaces(){syncRace(state.sRace);syncRace(state.cRace);renderSuitRace();$('conditionRace').innerHTML=raceHTML(state.cRace,'c');
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
   $('horseEditor').innerHTML=`<div class="rank-popularity"><strong>${esc(h.finish_position)}着</strong>
      <label>人気<select data-horse-field="popularity">${opts(numbers,h.popularity)}</select></label></div>
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
 function renderConditionResult(){const c=state.condition, size=Number(state.cRace.field_size)||18;
   $('cHorse').innerHTML=opts(Array.from({length:size},(_,i)=>String(i+1)),c.horse_number);
   $('cOutcome').value=c.outcome_status;$('cRank').value=c.finish_position||'1';
   $('cRankWrap').hidden=c.outcome_status!=='placed';$('cPopularityWrap').hidden=c.outcome_status==='scratched';
   $('cPopularity').innerHTML=opts(Array.from({length:size},(_,i)=>String(i+1)),c.popularity);}
 const draftKey=()=>`CPL_DEV_${ref}_RESEARCH_V1_${state.user?.id}`;
 function draft(){if(!state.user)return;try{localStorage.setItem(draftKey(),JSON.stringify({version:1,sRace:state.sRace,sRaceExpanded:state.sRaceExpanded,cRace:state.cRace,
   horses:state.horses,current:state.current,condition:state.condition,view:state.view,filter:state.filter,merge:state.merge,scrollY:scrollY}));}catch{notice('下書きを保存できませんでした。');}}
 function restore(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d?.version!==1)return;
   Object.assign(state,{sRace:d.sRace||blankRace(),cRace:d.cRace||blankRace(),horses:d.horses||[newHorse()],
      current:d.current||0,condition:d.condition||blankCondition(),view:d.view||'suitability',filter:d.filter||{},merge:!!d.merge});
   state.horses=state.horses.map(h=>h.popularity!==undefined?h:{...h,legacy_horse_number:h.horse_number||'',popularity:''});
   const selected=state.horses[state.current];state.horses=orderHorses(state.horses);
   state.current=Math.max(0,state.horses.indexOf(selected));
   state.sRaceExpanded=typeof d.sRaceExpanded==='boolean'?d.sRaceExpanded:!raceComplete(state.sRace);
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
 function validRace(r,mode){const missing=fields.find(([key])=>!r[key]);if(missing){
   if(mode==='s'){state.sRaceExpanded=true;renderSuitRace();}
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
 async function saveCondition(){try{validRace(state.cRace,'c');const c=state.condition;
   if(!c.horse_number)invalid('状態研究の「馬番」が未入力です。','#cHorse');
   if(!conditionChoices.some(([k])=>{const [f,v]=k.split(':');return v?c[f]===v:c[f]===true;}))
     invalid(`${c.horse_number}番の気になった状態を1つ以上選んでください。`,'#conditionChoices');
   if(c.outcome_status!=='scratched'&&!c.popularity)invalid(`${c.horse_number}番の「人気」が未入力です。`,'#cPopularity');
   $('saveCondition').disabled=true;
   await checked(db.rpc('save_condition_research',{p_race:state.cRace,p_horse:{...c,horse_number:Number(c.horse_number),
      finish_position:c.outcome_status==='placed'?Number(c.finish_position):null,
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
   checked(db.from('condition_observations').select('race_id,horse_number,outcome_status,finish_position,popularity,chaka,awkward_gait,agitation,sweating,fast_walking'))]);
   state.records=races.map(r=>({...r,suitability:suits.filter(s=>s.race_id===r.id),conditions:conditions.filter(c=>c.race_id===r.id)}));
   $('recordsList').innerHTML=state.records.filter(r=>r.suitability.length||r.conditions.length).map(r=>
     `<div class="card"><b>${r.race_date} ${esc(r.racecourse)} ${r.race_number}R</b><p>${esc(r.surface)} ${r.distance}m ${esc(r.course)}</p>
       <p>適性 ${r.suitability.length}頭／状態 ${r.conditions.length}頭</p>
       ${r.suitability.length?`<button data-open-suit="${r.id}">適性を開く</button>`:''}
       ${r.conditions.map(c=>`<button data-open-condition="${r.id}" data-number="${c.horse_number}">状態 ${c.horse_number}番を開く</button>`).join('')}</div>`).join('')||'<div class="card">研究記録はありません。</div>';
 }catch(e){notice(`記録を読めませんでした：${e.message}`)}}
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
   if(b.dataset.view){show(b.dataset.view);if(state.view==='summary')await summary();if(state.view==='records')await records();}
   else if(b.dataset.horseTab!==undefined){state.current=Number(b.dataset.horseTab);renderHorse();draft();}
   else if(b.dataset.raceToggle){state.sRaceExpanded=b.dataset.raceToggle==='open';renderSuitRace();draft();}
   else if(b.dataset.group){state.horses[state.current][b.dataset.group]=b.dataset.value;renderHorse();draft();}
   else if(b.dataset.condition){const [field,value]=b.dataset.condition.split(':');state.condition[field]=value?
     (state.condition[field]===value?null:value):!state.condition[field];renderChoices();draft();}
   else if(b.dataset.openSuit){const r=state.records.find(x=>x.id===b.dataset.openSuit);if(!r)return;
     state.sRace={race_date:r.race_date,racecourse:r.racecourse,race_number:String(r.race_number),surface:r.surface,
       distance:String(r.distance),course:r.course,track_condition:r.track_condition,field_size:String(r.field_size),race_class:r.race_class||''};
     state.horses=orderHorses(r.suitability.map(x=>({popularity:x.popularity?String(x.popularity):'',legacy_horse_number:x.horse_number?String(x.horse_number):'',finish_position:String(x.finish_position),
       chest:x.chest,hindquarter:x.hindquarter,tone:x.tone||''})));
     state.current=0;state.sRaceExpanded=false;renderRaces();show('suitability');window.scrollTo(0,0);}
   else if(b.dataset.openCondition){const r=state.records.find(x=>x.id===b.dataset.openCondition);
     const c=r?.conditions.find(x=>x.horse_number===Number(b.dataset.number));if(!c)return;
     state.cRace={race_date:r.race_date,racecourse:r.racecourse,race_number:String(r.race_number),surface:r.surface,
       distance:String(r.distance),course:r.course,track_condition:r.track_condition,field_size:String(r.field_size),race_class:r.race_class||''};
     state.condition={...c,horse_number:String(c.horse_number),finish_position:String(c.finish_position||1),
       popularity:c.popularity?String(c.popularity):'',agitation:c.agitation||null,sweating:c.sweating||null};
     renderRaces();renderChoices();show('condition');window.scrollTo(0,0);}
   else if(b.dataset.removeHorse!==undefined){state.horses.splice(state.current,1);state.current=Math.max(0,state.current-1);renderHorse();draft();}
 });
 document.addEventListener('change',async e=>{const el=e.target;
   if(el.dataset.race){const r=el.dataset.race==='s'?state.sRace:state.cRace,wasComplete=raceComplete(r);r[el.dataset.key]=el.value;
     if(['racecourse','surface','distance'].includes(el.dataset.key)){syncRace(r);renderRaces();}
     if(el.dataset.key==='field_size')renderRaces();
     if(el.dataset.race==='s'&&!wasComplete&&raceComplete(r)){state.sRaceExpanded=false;renderSuitRace();}
     draft();}
   else if(el.dataset.horseField){state.horses[state.current][el.dataset.horseField]=el.value;renderHorse();draft();}
   else if(el.dataset.filter){if(el.value)state.filter[el.dataset.filter]=el.value;else delete state.filter[el.dataset.filter];draft();await summary();}
 });
 for(const [id,key] of [['cHorse','horse_number'],['cOutcome','outcome_status'],['cRank','finish_position'],['cPopularity','popularity']])
   $(id).addEventListener('change',e=>{state.condition[key]=e.target.value;if(key==='outcome_status')renderConditionResult();draft();});
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
