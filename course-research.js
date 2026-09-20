(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const list = (id, values) => { $(id).innerHTML = (values || []).map(value => `<div class="research-list-item">${esc(value)}</div>`).join(''); };

  const COURSE_TYPES = {
    'turf-inner': {
      kicker: 'TURF · INNER',
      title: '芝・内回り',
      surface: '芝',
      course: '内回り',
      image: 'assets/nakayama-turf-inner.png',
      distances: [
        {distance: 1800}, {distance: 2000}, {distance: 2500}, {distance: 3600}
      ]
    },
    'turf-outer': {
      kicker: 'TURF · OUTER',
      title: '芝・外回り',
      surface: '芝',
      course: '外回り',
      image: 'assets/nakayama-turf-outer.png',
      distances: [
        {distance: 1200}, {distance: 1600}, {distance: 2200}, {distance: 2600},
        {distance: 3200, course: '外→内', special: true}, {distance: 4000}
      ]
    },
    dirt: {
      kicker: 'DIRT',
      title: 'ダート',
      surface: 'ダート',
      course: '右回り',
      image: 'assets/nakayama-dirt.png',
      distances: [
        {distance: 1000}, {distance: 1200}, {distance: 1700},
        {distance: 1800}, {distance: 2400}, {distance: 2500}
      ]
    }
  };

  let rows = [];
  let selectedCourseType = 'turf-inner';

  function renderRacecourses() {
    $('researchRacecourse').innerHTML = '<option value="中山">中山競馬場</option>';
  }

  function diagramDistanceLabel(item) {
    return item.special ? `${item.distance}m 外→内` : `${item.distance}m`;
  }

  function renderCourseType() {
    const type = COURSE_TYPES[selectedCourseType];
    document.querySelectorAll('.course-type-tab').forEach(button => {
      const active = button.dataset.courseType === selectedCourseType;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $('courseDiagramCard').className = `card course-diagram-card mode-${selectedCourseType}`;
    $('courseDiagramKicker').textContent = type.kicker;
    $('courseDiagramTitle').textContent = type.title;
    $('courseDiagram').src = type.image;
    $('courseDiagram').alt = `中山競馬場 ${type.title}コース立体図`;
    $('diagramDistances').innerHTML = type.distances.map(item => `<span${item.special ? ' class="special"' : ''}>${diagramDistanceLabel(item)}</span>`).join('');
    renderDistances();
  }

  function renderDistances() {
    const type = COURSE_TYPES[selectedCourseType];
    $('researchDistances').innerHTML = type.distances.map(item => {
      const lookupCourse = item.course || type.course;
      const row = rows.find(candidate =>
        candidate.racecourse === '中山' &&
        candidate.surface === type.surface &&
        Number(candidate.distance) === item.distance &&
        candidate.course === lookupCourse
      );
      return `<button type="button" class="distance-button${item.special ? ' special' : ''}" data-distance="${item.distance}" data-course="${esc(lookupCourse)}" data-id="${row?.id || ''}"><b>${item.distance}</b><small>m</small>${item.special ? '<span>外→内</span>' : ''}</button>`;
    }).join('');
    $('researchDetail').classList.add('hidden');
    $('researchEmpty').classList.add('hidden');
  }

  function renderStructure(structure) {
    const phases = Array.isArray(structure?.phases) ? structure.phases : [];
    $('courseStructure').innerHTML = phases.map((phase, index) => {
      const range = phase.range || {};
      const subevents = (phase.subevents || []).map(event => `<div class="structure-subevent"><span>その中に</span><b>${esc(event.label)}</b><small>${esc(event.range?.from)} → ${esc(event.range?.to)}</small></div>`).join('');
      return `<div class="structure-phase"><div class="phase-index">${String(index + 1).padStart(2, '0')}</div><div class="phase-body"><h3>${esc(phase.label)}</h3><div class="phase-range"><span>${esc(range.from)}</span><i>→</i><span>${esc(range.to)}</span></div><p>${esc(phase.description)}</p>${subevents}</div></div>${index < phases.length - 1 ? '<div class="structure-arrow">↓</div>' : ''}`;
    }).join('');
  }

  function renderIdealBody(body) {
    const variants = Array.isArray(body?.variants) ? body.variants : [];
    $('idealBody').innerHTML = variants.slice(0, 2).map((variant, index) => `<div class="hypothesis-variant variant-${index + 1}"><div class="variant-head"><b>${esc(variant.label || `案${index + 1}`)}</b><span>並列仮説</span></div><div class="body-summary"><div><span>胸前</span><b>${esc(variant.chest || '—')}</b></div><div><span>トモ</span><b>${esc(variant.hindquarter || '—')}</b></div><div><span>ハリ</span><b>${esc(variant.tone || '—')}</b></div></div></div>`).join('');
  }

  function renderAnalysis(analysis) {
    $('analysisStatus').textContent = analysis?.label || 'データ蓄積中';
    $('analysisMessage').textContent = analysis?.message || '1〜3着馬の馬体データが蓄積されるまで、分析結果は確定しません。';
  }

  function renderDetail(row) {
    $('researchDetail').classList.remove('hidden');
    $('researchEmpty').classList.add('hidden');
    $('researchStatus').textContent = row.status || '仮説';
    $('researchTitle').textContent = row.title;
    $('researchDate').textContent = row.researched_at ? `研究日 ${row.researched_at}` : '';
    $('researchCondition').innerHTML = [row.racecourse, row.surface, `${row.distance}m`, row.course].map(value => `<span>${esc(value)}</span>`).join('');
    $('researchSummary').textContent = row.summary || '';
    renderStructure(row.course_structure || {});
    list('researchRequirements', row.requirements);
    renderIdealBody(row.ideal_body_hypothesis || {});
    renderAnalysis(row.analysis || {});
    list('researchFacts', row.facts);
    $('officialSource').href = row.official_source_url || 'https://www.jra.go.jp/facilities/race/nakayama/course/';
    document.querySelectorAll('.distance-button').forEach(button => button.classList.toggle('active', String(button.dataset.id) === String(row.id)));
    $('researchDetail').scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  $('researchRacecourse').addEventListener('change', renderCourseType);
  $('courseTypeTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-course-type]');
    if (!button) return;
    selectedCourseType = button.dataset.courseType;
    renderCourseType();
  });
  $('researchDistances').addEventListener('click', event => {
    const button = event.target.closest('[data-distance]');
    if (!button) return;
    const row = rows.find(candidate => String(candidate.id) === button.dataset.id);
    const isApprovedTemplate = row && row.racecourse === '中山' && row.surface === '芝' && Number(row.distance) === 2000 && row.course === '内回り';
    if (!isApprovedTemplate) {
      $('researchDetail').classList.add('hidden');
      $('researchEmpty').classList.remove('hidden');
      $('researchEmpty').textContent = button.dataset.distance === '3200' ? '3200m 外→内は研究未確定です。' : `${button.dataset.distance}m は研究未確定です。`;
      return;
    }
    renderDetail(row);
  });

  async function init() {
    renderRacecourses();
    renderCourseType();
    try {
      if (!window.supabase?.createClient) throw new Error('Supabaseライブラリを読み込めませんでした。再読み込みしてください。');
      if (!window.CPL_SUPABASE_URL || !window.CPL_SUPABASE_KEY) throw new Error('Supabase設定を読み込めませんでした。再読み込みしてください。');
      const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
      const {data: {session}} = await client.auth.getSession();
      if (!session) { location.replace('index.html'); return; }
      const {data, error} = await client.from('course_research').select('*').eq('racecourse', '中山').order('distance');
      if (error) throw error;
      rows = data || [];
      renderDistances();
    } catch (error) {
      $('researchError').textContent = `研究データを読み込めませんでした: ${error?.message || String(error)}`;
    }
  }

  init();
})();
