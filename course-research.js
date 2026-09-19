(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
  let rows = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = (target, values) => { $(target).innerHTML = (values || []).map(v => `<div class="research-list-item">${esc(v)}</div>`).join(''); };

  function horseDiagram(chest, hindquarter, tone) {
    return `<div class="horse-diagram" aria-label="馬体図">
      <svg viewBox="0 0 360 190" role="img" aria-label="胸前とトモの位置を示す馬体模式図">
        <path class="horse-body" d="M93 58 C120 38 204 36 249 58 C268 67 280 81 278 99 C276 115 257 123 238 122 L226 166 L208 166 L204 121 L137 121 L129 166 L111 166 L112 116 C91 108 77 94 77 78 C77 70 83 63 93 58Z"/>
        <path class="horse-neck" d="M102 70 C83 56 69 38 58 23 L43 28 C52 50 59 74 79 89Z"/>
        <circle class="horse-head" cx="42" cy="25" r="17"/>
        <ellipse class="horse-chest" cx="112" cy="91" rx="28" ry="42"/>
        <ellipse class="horse-hind" cx="241" cy="91" rx="35" ry="43"/>
        <path class="horse-tail" d="M273 73 C310 68 323 49 337 39 C326 68 312 94 277 103"/>
      </svg>
      <div class="horse-label chest-label">胸前 <b>${esc(chest || '—')}</b></div>
      <div class="horse-label hind-label">トモ <b>${esc(hindquarter || '—')}</b></div>
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
    return `<svg viewBox="0 0 560 300" role="img" aria-label="中山競馬場の内回りと外回りの模式図">
      <path class="route-outer" d="M72 218 C34 177 46 97 124 66 C214 31 407 26 494 74 C542 101 535 162 486 184 C452 199 420 201 390 204"/>
      <path class="route-inner ${inner ? 'route-active' : ''}" d="M72 218 C47 182 59 120 124 94 C199 64 365 65 438 95 C485 114 490 166 448 194 C383 237 156 247 72 218Z"/>
      <path class="home-line" d="M72 218 C178 246 352 237 448 194"/>
      <circle class="start-dot" cx="357" cy="228" r="8"/><text x="367" y="252" class="start-text">START</text>
      <circle class="goal-dot" cx="118" cy="231" r="8"/><text x="76" y="266" class="goal-text">GOAL</text>
      <text x="304" y="49" class="outer-label">外回り</text>
      <text x="236" y="154" class="inner-label">内回り（今回）</text>
      <path class="route-arrow" d="M404 218 l-18 -8 l5 18Z"/><path class="route-arrow" d="M83 177 l-8 -18 l19 5Z"/>
      <text x="179" y="286" class="route-caption">${esc(row.racecourse)} ${esc(row.surface)} ${esc(row.distance)}m・${esc(row.course)}</text>
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