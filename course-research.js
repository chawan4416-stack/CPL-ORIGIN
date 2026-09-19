(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
  let rows = [], selectedSurface = '芝', currentRow = null;

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=(id,a)=>$(id).innerHTML=(a||[]).map(v=>`<div class="research-list-item">${esc(v)}</div>`).join('');

  const NAKAYAMA_TURF = [
    [1200,'外回り'],[1600,'外回り'],[1800,'内回り'],[2000,'内回り'],[2200,'外回り'],
    [2500,'内回り'],[2600,'外回り'],[3200,'外→内'],[3600,'内回り'],[4000,'外回り']
  ];

  function horseDiagram(chest,hind,tone){
    return `<div class="body-summary"><div><span>胸前</span><b>${esc(chest||'—')}</b></div><div><span>トモ</span><b>${esc(hind||'—')}</b></div><div><span>質感</span><b>${esc(tone||'—')}</b></div></div>`;
  }
  function renderIdealBody(body){
    const vs=Array.isArray(body?.variants)?body.variants:[];
    $('idealBody').innerHTML=vs.slice(0,2).map((v,i)=>`<div class="hypothesis-variant variant-${i+1}"><div class="variant-head">${esc(v.label||`仮説${i+1}`)}</div>${horseDiagram(v.chest,v.hindquarter,v.tone)}</div>`).join('');
  }

  function renderRacecourses(){
    const names=[...new Set(rows.map(r=>r.racecourse))];
    if(!names.includes('中山')) names.unshift('中山');
    $('researchRacecourse').innerHTML=names.map(v=>`<option>${esc(v)}</option>`).join('');
    renderDistances();
  }

  function renderOverview(){ renderDistances(); }

  function renderDistances(){
    const rc=$('researchRacecourse').value;
    let candidates=rows.filter(r=>r.racecourse===rc && r.surface===selectedSurface);
    const master=(rc==='中山'&&selectedSurface==='芝')?NAKAYAMA_TURF:candidates.map(r=>[r.distance,r.course]);
    $('researchDistances').innerHTML=master.map(([d,c])=>{
      const row=candidates.find(r=>Number(r.distance)===d);
      return `<button type="button" class="distance-button" data-distance="${d}" data-id="${row?.id||''}">${d}<small>m</small><span>${esc(c)}</span></button>`;
    }).join('');
    $('researchDetail').classList.add('hidden');
    $('researchEmpty').classList.add('hidden');
  }

  function officialCourseImage(row){
    if(row.racecourse==='中山'&&row.surface==='芝'&&Number(row.distance)===2000)
      return 'https://www.jra.go.jp/keiba/g1/_common/course/_img/nakayama_2000.png';
    return row.official_course_image_url||'';
  }

  function elevationSvg(distance){
    // 2000m template only: schematic synchronization layer. Remaining-distance labels are the shared coordinate.
    const points=[[0,82],[180,56],[400,42],[600,45],[800,55],[1000,66],[1200,78],[1400,88],[1600,94],[1780,96],[1890,74],[2000,58]];
    const W=720,H=180,pad=18;
    const xy=points.map(([s,h])=>[pad+s/distance*(W-pad*2),h+18]);
    const path=xy.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1]}`).join(' ');
    const ticks=[2000,1600,1200,800,400,0];
    return `<svg viewBox="0 0 ${W} ${H}" role="img"><path class="elev-line" d="${path}"/><line class="elev-base" x1="${pad}" y1="126" x2="${W-pad}" y2="126"/>${ticks.map(rem=>{const s=distance-rem,x=pad+s/distance*(W-pad*2);return `<g><line class="elev-tick" x1="${x}" y1="20" x2="${x}" y2="126"/><text x="${x}" y="151" text-anchor="middle">${rem===distance?'START':rem===0?'GOAL':`残${rem}`}</text></g>`}).join('')}<rect id="elevationFocusRect" class="elev-focus hidden" x="0" y="16" width="0" height="112"/></svg>`;
  }

  function focusDefs(distance){
    return [
      {label:'全体',from:distance,to:0,text:'全体表示'},
      {label:'残1600→1200',from:1600,to:1200,text:'上りの頂点付近から下りへ'},
      {label:'残1200→800',from:1200,to:800,text:'長い下り区間｜向正面方向'},
      {label:'残800→400',from:800,to:400,text:'下りで速度を持ったまま3角へ'},
      {label:'残400→GOAL',from:400,to:0,text:'4角 → 短い直線 → ゴール前急坂'}
    ];
  }

  function setFocus(index){
    const defs=focusDefs(Number(currentRow.distance)), def=defs[index];
    document.querySelectorAll('.focus-segment').forEach((b,i)=>b.classList.toggle('active',i===index));
    $('focusSummary').textContent=def.text;
    const rect=document.getElementById('elevationFocusRect');    const overlay=$('planFocusOverlay');
    overlay?.classList.add('hidden');
  }

  function renderDetail(row){
    currentRow=row;
    $('researchDetail').classList.remove('hidden');$('researchEmpty').classList.add('hidden');
    $('researchStatus').textContent=row.status||'仮説';$('researchTitle').textContent=row.title;
    $('researchDate').textContent=row.researched_at?`研究日 ${row.researched_at}`:'';
    $('researchCondition').innerHTML=[row.racecourse,row.surface,`${row.distance}m`,row.course].map(v=>`<span>${esc(v)}</span>`).join('');
    $('officialCourseImage').src=officialCourseImage(row);
    $('elevationChart').innerHTML=elevationSvg(Number(row.distance));
    const defs=focusDefs(Number(row.distance));
    $('focusSegments').innerHTML=defs.map((d,i)=>`<button class="focus-segment${i===0?' active':''}" data-focus="${i}">${esc(d.label)}</button>`).join('');
    $('focusSummary').textContent='全体表示';
    $('researchSummary').textContent=row.summary||'';
    $('researchFlow').innerHTML=(row.flow||[]).map((v,i)=>`${i?'<span class="flow-arrow">→</span>':''}<span class="flow-step">${esc(v)}</span>`).join('');
    list('researchRequirements',row.requirements);list('researchFacts',row.facts);renderIdealBody(row.ideal_body_hypothesis||{});
    $('officialSource').href=row.official_source_url||'#';
    document.querySelectorAll('.distance-button').forEach(b=>b.classList.toggle('active',Number(b.dataset.distance)===Number(row.distance)));
    $('researchDetail').scrollIntoView({behavior:'smooth',block:'start'});
  }

  $('researchRacecourse').addEventListener('change',renderOverview);
  $('surfaceTabs').addEventListener('click',e=>{const b=e.target.closest('[data-surface]');if(!b)return;selectedSurface=b.dataset.surface;document.querySelectorAll('.surface-tab').forEach(x=>x.classList.toggle('active',x===b));renderDistances();});
  $('researchDistances').addEventListener('click',e=>{
    const b=e.target.closest('[data-distance]');if(!b)return;
    if(!b.dataset.id){$('researchDetail').classList.add('hidden');$('researchEmpty').classList.remove('hidden');$('researchEmpty').textContent=`${b.dataset.distance}m は研究未確定です。雛型完成後に展開します。`;return;}
    const row=rows.find(r=>String(r.id)===b.dataset.id);if(row)renderDetail(row);
  });
  $('focusSegments').addEventListener('click',e=>{const b=e.target.closest('[data-focus]');if(b)setFocus(Number(b.dataset.focus));});

  async function init(){
    try{
      const {data:{session}}=await client.auth.getSession();if(!session){location.replace('index.html');return;}
      const {data,error}=await client.from('course_research').select('*').order('racecourse').order('distance');if(error)throw error;
      rows=data||[];$('courseResearchApp').classList.remove('hidden');renderRacecourses();
    }catch(error){$('courseResearchApp').classList.remove('hidden');$('researchError').textContent=`研究データを読み込めませんでした: ${error.message}`;}
  }
  init();
})();