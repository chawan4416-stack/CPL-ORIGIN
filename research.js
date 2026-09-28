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
 const newHorse=(rank=1)=>({horse_number:'',finish_position:String(rank),chest:'',hindquarter:'',tone:''});
 const blankCondition=()=>({horse_number:'',outcome_status:'placed',finish_position:'1',popularity:'',chaka:false,awkward_gait:false,agitation:null,sweating:null,fast_walking:false});
 const state={user:null,masters:{},sRace:blankRace(),cRace:blankRace(),horses:[newHorse(1),newHorse(2),newHorse(3)],current:0,
   condition:blankCondition(),filter:{},merge:false,view:'suitability',records:[]};
 const fields=[['race_date','開催日'],['racecourse','競馬場'],['race_number','レース'],['surface','芝・ダート'],
   ['distance','距離'],['course','コース形態'],['track_condition','馬場状態'],['field_size','頭数']];
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
 function renderRaces(){syncRace(state.sRace);syncRace(state.cRace);$('suitRace').innerHTML=raceHTML(state.sRace,'s');$('conditionRace').innerHTML=raceHTML(state.cRace,'c');
   renderHorse();renderConditionResult();}
 function choice(group,value,label,current){return `<button type="button" class="choice${current===value?' active':''}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${current===value}">${esc(label)}</button>`;}
 function renderHorse(){const h=state.horses[state.current];$('horseTabs').innerHTML=state.horses.map((x,i)=>
   `<button type="button" data-horse-tab="${i}" class="${state.current===i?'active':''}">${esc(x.finish_position)}着・${x.horse_number?esc(x.horse_number)+'番':'馬番未選択'}</button>`).join('');
   const numbers=Array.from({length:Number(state.sRace.field_size)||18},(_,i)=>String(i+1));
   $('horseEditor').innerHTML=`<div class="fields"><label>公式着順<select data-horse-field="finish_position">${opts(['1','2','3'],h.finish_position)}</select></label>
      <label>馬番<select data-horse-field="horse_number">${opts(numbers,h.horse_number)}</select></label></div>
      <div class="group"><strong>胸前</strong><div class="choices">${values('SUITABILITY','CHEST').map(v=>choice('chest',v,v,h.chest)).join('')}</div></div>
      <div class="group"><strong>トモ</strong>${[['シャープ','シャープ−','シャープ'],['厚','厚−','厚'],['重厚','重厚−','重厚']].map(([label,a,b])=>
        `<div class="row"><span>${label}</span><div class="choices">${[a,b].map(v=>choice('hindquarter',v,v,h.hindquarter)).join('')}</div></div>`).join('')}</div>
      <div class="group"><strong>ハリ</strong><div class="choices">${values('SUITABILITY','TONE').map(v=>choice('tone',v,v,h.tone)).join('')}</div></div>
      ${state.horses.length>3?'<button type="button" data-remove-horse class="secondary">この馬を外す</button>':''}`;}
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
 function draft(){if(!state.user)return;try{localStorage.setItem(draftKey(),JSON.stringify({version:1,sRace:state.sRace,cRace:state.cRace,
   horses:state.horses,current:state.current,condition:state.condition,view:state.view,filter:state.filter,merge:state.merge,scrollY:scrollY}));}catch{notice('下書きを保存できませんでした。');}}
 function restore(){try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d?.version!==1)return;
   Object.assign(state,{sRace:d.sRace||blankRace(),cRace:d.cRace||blankRace(),horses:d.horses||[newHorse()],
      current:d.current||0,condition:d.condition||blankCondition(),view:d.view||'suitability',filter:d.filter||{},merge:!!d.merge});
   state.current=Math.min(state.current,state.horses.length-1);
   setTimeout(()=>window.scrollTo(0,d.scrollY||0),100);}catch{}}
 function notice(message,ok=false){$('message').textContent=message;$('message').classList.toggle('ok',ok);}
 async function checked(promise){const {data,error}=await promise;if(error)throw error;return data;}
 async function loadMasters(){const rows=await checked(db.from('master_options').select('category,field_key,option_value,sort_order').eq('active',true).order('sort_order'));
   for(const row of rows)(state.masters[`${row.category}:${row.field_key}`]||=[]).push(row);}
 function show(view){state.view=view;document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==view);
   document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));draft();}
 function validRace(r){if(fields.some(([key])=>!r[key]))throw Error('レース情報の必須項目を入力してください。');}
 async function saveSuitability(){try{validRace(state.sRace);const rows=state.horses.map(h=>({horse_number:Number(h.horse_number),
   finish_position:Number(h.finish_position),chest:h.chest,hindquarter:h.hindquarter,tone:h.tone||null}));
   if(rows.some(h=>!h.horse_number||!h.finish_position||!h.chest||!h.hindquarter||!h.tone)||
      new Set(rows.map(h=>h.horse_number)).size!==rows.length)throw Error('各馬の馬番・胸前・トモ・ハリを入力し、馬番の重複を解消してください。');
   if(!rows.some(h=>h.finish_position===1))throw Error('公式1着馬を含めてください。');
   $('saveSuitability').disabled=true;await checked(db.rpc('save_suitability_research',{p_race:state.sRace,p_horses:rows}));
   state.horses=[newHorse(1),newHorse(2),newHorse(3)];state.current=0;renderHorse();draft();notice('適性研究を保存しました。',true);
 }catch(e){notice(`保存できませんでした：${e.message}`)}finally{$('saveSuitability').disabled=false;}}
 async function saveCondition(){try{validRace(state.cRace);const c=state.condition;
   if(!c.horse_number||!conditionChoices.some(([k])=>{const [f,v]=k.split(':');return v?c[f]===v:c[f]===true;}))
      throw Error('馬番と気になった状態を選んでください。');
   if(c.outcome_status!=='scratched'&&!c.popularity)throw Error('公式人気を選んでください。');
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
   checked(db.from('suitability_observations').select('race_id,horse_number,finish_position,chest,hindquarter,tone')),
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
   else if(b.dataset.group){state.horses[state.current][b.dataset.group]=b.dataset.value;renderHorse();draft();}
   else if(b.dataset.condition){const [field,value]=b.dataset.condition.split(':');state.condition[field]=value?
     (state.condition[field]===value?null:value):!state.condition[field];renderChoices();draft();}
   else if(b.dataset.openSuit){const r=state.records.find(x=>x.id===b.dataset.openSuit);if(!r)return;
     state.sRace={race_date:r.race_date,racecourse:r.racecourse,race_number:String(r.race_number),surface:r.surface,
       distance:String(r.distance),course:r.course,track_condition:r.track_condition,field_size:String(r.field_size),race_class:r.race_class||''};
     state.horses=r.suitability.map(x=>({horse_number:String(x.horse_number),finish_position:String(x.finish_position),
       chest:x.chest,hindquarter:x.hindquarter,tone:x.tone||''}));state.current=0;renderRaces();show('suitability');window.scrollTo(0,0);}
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
   if(el.dataset.race){const r=el.dataset.race==='s'?state.sRace:state.cRace;r[el.dataset.key]=el.value;
     if(['racecourse','surface','distance'].includes(el.dataset.key)){syncRace(r);renderRaces();}
     if(el.dataset.key==='field_size')renderRaces();draft();}
   else if(el.dataset.horseField){state.horses[state.current][el.dataset.horseField]=el.value;renderHorse();draft();}
   else if(el.dataset.filter){if(el.value)state.filter[el.dataset.filter]=el.value;else delete state.filter[el.dataset.filter];draft();await summary();}
 });
 for(const [id,key] of [['cHorse','horse_number'],['cOutcome','outcome_status'],['cRank','finish_position'],['cPopularity','popularity']])
   $(id).addEventListener('change',e=>{state.condition[key]=e.target.value;if(key==='outcome_status')renderConditionResult();draft();});
 $('addHorse').onclick=()=>{if(state.horses.length>=18)return notice('最大18頭です。');state.horses.push(newHorse(3));state.current=state.horses.length-1;renderHorse();draft();};
 $('saveSuitability').onclick=saveSuitability;$('saveCondition').onclick=saveCondition;
 $('merge').onclick=async()=>{state.merge=!state.merge;draft();await summary();};
 $('login').onclick=async()=>{const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}${location.pathname}`}});if(error)notice(error.message);};
 $('logout').onclick=async()=>{await db.auth.signOut();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)draft();});window.addEventListener('pagehide',draft);
 let initialized=false;
 async function auth(session){if(session?.user){if(initialized&&state.user?.id===session.user.id)return;
   state.user=session.user;initialized=true;try{await loadMasters();restore();renderRaces();renderChoices();$('filters').innerHTML=filterHTML();
     $('auth').hidden=true;$('workspace').hidden=false;show(state.view);if(state.view==='summary')await summary();if(state.view==='records')await records();
   }catch(e){notice(`初期化できませんでした：${e.message}`)}}else{state.user=null;initialized=false;$('auth').hidden=false;$('workspace').hidden=true;}}
 db.auth.onAuthStateChange((event,session)=>{if(event==='TOKEN_REFRESHED')return;setTimeout(()=>auth(session),0);});
 db.auth.getSession().then(({data})=>auth(data.session));
})();
