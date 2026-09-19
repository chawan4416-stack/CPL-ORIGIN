(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
  let rows = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = (target, values) => { $(target).innerHTML = (values || []).map(v => `<div class="research-list-item">${esc(v)}</div>`).join(''); };

  function horseDiagram(chest, hindquarter, tone) {
    const chestClass = chest === '重厚' ? 'mass-4' : chest === '厚' ? 'mass-3' : chest === '普通' ? 'mass-2' : 'mass-1';
    const hindClass = hindquarter === '重厚' ? 'mass-4' : hindquarter === '厚' ? 'mass-3' : hindquarter === '普通' ? 'mass-2' : 'mass-1';
    return `<div class="horse-diagram" aria-label="馬体図">
      <svg viewBox="0 0 440 245" role="img" aria-label="胸前とトモを示す馬体模式図">
        <defs><linearGradient id="coat" x1="0" x2="1"><stop offset="0" stop-color="#5b3a2c"/><stop offset=".48" stop-color="#8a6048"/><stop offset="1" stop-color="#4c3026"/></linearGradient></defs>
        <path class="horse-tail" d="M348 87 C392 79 412 52 425 34 C418 72 397 111 351 123"/>
        <path class="horse-neck" d="M134 100 C109 77 92 48 82 22 L58 27 C67 57 79 90 104 116Z"/>
        <path class="horse-head" d="M78 18 C64 6 43 8 32 24 C23 37 30 55 46 60 C61 64 76 54 83 40Z"/>
        <path class="horse-ear" d="M55 15 L54 0 L66 14 M73 18 L80 4 L82 23"/>
        <path class="horse-body" d="M112 91 C149 55 271 54 332 78 C359 89 372 112 363 137 C356 156 334 166 307 165 L296 223 L275 223 L269 165 L170 165 L158 223 L137 223 L139 158 C112 150 94 132 94 112 C94 103 101 96 112 91Z"/>
        <ellipse class="horse-chest ${chestClass}" cx="151" cy="126" rx="34" ry="51"/>
        <ellipse class="horse-hind ${hindClass}" cx="315" cy="126" rx="45" ry="53"/>
        <path class="horse-leg" d="M145 158 L135 230 M169 160 L176 230 M291 162 L282 230 M323 161 L330 230"/>
      </svg>
      <div class="body-callout chest-callout"><span>胸前</span><b>${esc(chest || '—')}</b></div>
      <div class="body-callout hind-callout"><span>トモ</span><b>${esc(hindquarter || '—')}</b></div>
      ${tone ? `<div class="tone-label">質感 <b>${esc(tone)}</b></div>` : ''}
    </div>`;
  }

  function renderIdealBody(body) {
    const variants = Array.isArray(body.variants) && body.variants.length ? body.variants : [{
      label:'仮説A', chest:body.chest, hindquarter:body.hindquarter, tone:body.tone
    }];
    $('idealBody').innerHTML = variants.slice(0,2).map((v,i) => `
      <div class="hypothesis-variant variant-${i+1}">
        <div class="variant-head"><span>${esc(v.label || `仮説${i+1}`)}</span></div>
        ${horseDiagram(v.chest, v.hindquarter, v.tone)}
      </div>`).join('');
  }

  function routeDiagram(row) {
    const inner = row.course === '内回り';
    return `<svg viewBox="0 0 620 365" role="img" aria-label="中山競馬場 全体形状と今回の走行ルート模式図">
      <rect x="10" y="10" width="600" height="345" rx="24" class="map-bg"/>
      <text x="32" y="44" class="map-title">中山競馬場</text>
      <text x="32" y="66" class="map-subtitle">全体形状を残し、今回の走路だけを強調</text>
      <path class="route-outer" d="M95 282 C47 254 42 185 76 131 C112 74 191 39 300 42 C413 45 526 82 558 139 C580 178 561 220 520 237 C491 249 459 246 429 247"/>
      <path class="route-inner ${inner ? 'route-active' : ''}" d="M95 282 C66 257 69 203 103 168 C146 124 222 108 319 112 C420 116 492 145 510 183 C529 224 489 260 431 275 C343 298 184 309 95 282Z"/>
      <path class="chute" d="M431 275 C470 280 519 291 577 316"/>
      <path class="home-line" d="M95 282 C190 310 343 298 431 275"/>
      <path class="start-guide" d="M455 281 L493 291"/>
      <circle class="start-dot" cx="493" cy="291" r="9"/><text x="504" y="316" class="start-text">START</text>
      <circle class="goal-dot" cx="144" cy="294" r="9"/><text x="91" y="329" class="goal-text">GOAL</text>
      <text x="342" y="82" class="outer-label">外回り</text>
      <text x="255" y="202" class="inner-label">内回り</text>
      <text x="252" y="226" class="active-label">今回走るルート</text>
      <path class="route-arrow" d="M415 282 l-22 -10 l7 22Z"/><path class="route-arrow" d="M91 222 l-10 -22 l23 7Z"/><path class="route-arrow" d="M250 120 l22 -8 l-7 21Z"/>
      <g class="corner-labels"><text x="476" y="252">1角</text><text x="467" y="157">2角</text><text x="104" y="150">3角</text><text x="66" y="258">4角</text></g>
      <text x="32" y="347" class="route-caption">${esc(row.racecourse)} ｜ ${esc(row.surface)} ｜ ${esc(row.distance)}m ｜ ${esc(row.course)}</text>
    </svg>`;
  }

  function renderRacecourses() {
    const racecourses = [...new Set(rows.map(row => row.racecourse))];
    $('researchRacecourse').innerHTML = racecourses.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    renderDistances();
  }

  function renderDistances() {
    const racecourse = $('researchRacecourse').value;
    const candidates = rows.filter(row => row.racecourse === racecourse).sort((a,b) => a.distance - b.distance);
    $('researchDistances').innerHTML = candidates.map((row, index) => `<button type="button" class="distance-button${index === 0 ? ' active' : ''}" data-id="${row.id}">${esc(row.surface)} ${esc(row.distance)}m<span>${esc(row.course)}</span></button>`).join('');
    if (candidates[0]) renderDetail(candidates[0].id); else showEmpty();
  }

  function showEmpty() { $('researchDetail').classList.add('hidden'); $('researchEmpty').classList.remove('hidden'); }

  function renderDetail(id) {
    const row = rows.find(item => String(item.id) === String(id));
    if (!row) return showEmpty();
    $('researchEmpty').classList.add('hidden'); $('researchDetail').classList.remove('hidden');
    document.querySelectorAll('.distance-button').forEach(button => button.classList.toggle('active', String(button.dataset.id) === String(id)));
    $('researchStatus').textContent = row.status || '仮説';
    $('researchTitle').textContent = row.title;
    $('researchDate').textContent = row.researched_at ? `研究日 ${row.researched_at}` : '';
    $('researchCondition').innerHTML = [row.racecourse,row.surface,`${row.distance}m`,row.course].map(v=>`<span>${esc(v)}</span>`).join('');
    $('researchSummary').textContent = row.summary || '';
    $('courseRouteDiagram').innerHTML = routeDiagram(row);
    const courseImg = $('officialCourseImage'), elevationImg = $('officialElevationImage');
    courseImg.src = row.official_course_image_url || ''; courseImg.classList.toggle('hidden', !row.official_course_image_url);
    elevationImg.src = row.official_elevation_image_url || ''; elevationImg.classList.toggle('hidden', !row.official_elevation_image_url);
    $('officialSource').href = row.official_source_url || '#';
    list('researchPoints', row.points); list('researchRequirements', row.requirements); list('researchFacts', row.facts);
    $('researchFlow').innerHTML = (row.flow || []).map((v, i) => `${i ? '<span class="flow-arrow">→</span>' : ''}<span class="flow-step">${esc(v)}</span>`).join('');
    renderIdealBody(row.ideal_body_hypothesis || {});
    scrollTo({top:0,behavior:'instant'});
  }

  $('researchRacecourse').addEventListener('change', renderDistances);
  $('researchDistances').addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (button) renderDetail(button.dataset.id); });
  $('showResearchReason').addEventListener('click', () => $('researchReason').scrollIntoView({behavior:'smooth',block:'start'}));

  async function init() {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { location.replace('index.html'); return; }
      const { data, error } = await client.from('course_research').select('*').order('racecourse').order('distance');
      if (error) throw error;
      rows = data || []; $('courseResearchApp').classList.remove('hidden');
      if (rows.length) renderRacecourses(); else showEmpty();
    } catch (error) {
      $('courseResearchApp').classList.remove('hidden');
      $('researchError').textContent = `研究データを読み込めませんでした: ${error.message}`;
    }
  }
  init();
})();