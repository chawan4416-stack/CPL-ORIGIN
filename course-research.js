(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
  let rows = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = (target, values) => { $(target).innerHTML = (values || []).map(v => `<div class="research-list-item">${esc(v)}</div>`).join(''); };

  function renderRacecourses() {
    const racecourses = [...new Set(rows.map(row => row.racecourse))];
    $('researchRacecourse').innerHTML = racecourses.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    renderDistances();
  }

  function renderDistances() {
    const racecourse = $('researchRacecourse').value;
    const candidates = rows.filter(row => row.racecourse === racecourse).sort((a,b) => a.distance - b.distance);
    $('researchDistances').innerHTML = candidates.map((row, index) => `<button type="button" class="distance-button${index === 0 ? ' active' : ''}" data-id="${row.id}">${esc(row.surface)} ${esc(row.distance)}m<span>${esc(row.course)}</span></button>`).join('');
    if (candidates[0]) renderDetail(candidates[0].id);
    else showEmpty();
  }

  function showEmpty() {
    $('researchDetail').classList.add('hidden');
    $('researchEmpty').classList.remove('hidden');
  }

  function renderDetail(id) {
    const row = rows.find(item => String(item.id) === String(id));
    if (!row) return showEmpty();
    $('researchEmpty').classList.add('hidden');
    $('researchDetail').classList.remove('hidden');
    document.querySelectorAll('.distance-button').forEach(button => button.classList.toggle('active', String(button.dataset.id) === String(id)));
    $('researchStatus').textContent = row.status || '仮説';
    $('researchTitle').textContent = row.title;
    $('researchDate').textContent = row.researched_at ? `研究日 ${row.researched_at}` : '';
    $('researchSummary').textContent = row.summary || '';
    $('officialCourseImage').src = row.official_course_image_url || '';
    $('officialElevationImage').src = row.official_elevation_image_url || '';
    $('officialSource').href = row.official_source_url || '#';
    list('researchPoints', row.points);
    list('researchRequirements', row.requirements);
    list('researchFacts', row.facts);
    $('researchFlow').innerHTML = (row.flow || []).map((v, i) => `${i ? '<span class="flow-arrow">→</span>' : ''}<span class="flow-step">${esc(v)}</span>`).join('');

    const body = row.ideal_body_hypothesis || {};
    const labels = { chest:'胸前', hindquarter:'トモ', balance:'前後バランス', tone:'ハリ', gait:'歩様' };
    $('idealBody').innerHTML = `${body.overall ? `<div class="ideal-overall">${esc(body.overall)}</div>` : ''}${Object.entries(labels).map(([key,label]) => body[key] ? `<div class="ideal-row"><b>${label}</b><span>${esc(body[key])}</span></div>` : '').join('')}`;
  }

  $('researchRacecourse').addEventListener('change', renderDistances);
  $('researchDistances').addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (button) renderDetail(button.dataset.id);
  });

  async function init() {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { location.replace('index.html'); return; }
      const { data, error } = await client.from('course_research').select('*').order('racecourse').order('distance');
      if (error) throw error;
      rows = data || [];
      $('courseResearchApp').classList.remove('hidden');
      if (rows.length) renderRacecourses(); else showEmpty();
    } catch (error) {
      $('courseResearchApp').classList.remove('hidden');
      $('researchError').textContent = `研究データを読み込めませんでした: ${error.message}`;
    }
  }

  init();
})();
