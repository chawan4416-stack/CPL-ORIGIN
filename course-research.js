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
      image: 'assets/nakayama-turf-inner.png?v=20260920-17',
      distances: [
        {distance: 1800}, {distance: 2000}, {distance: 2500}, {distance: 3600}
      ]
    },
    'turf-outer': {
      kicker: 'TURF · OUTER',
      title: '芝・外回り',
      surface: '芝',
      course: '外回り',
      image: 'assets/nakayama-turf-outer.png?v=20260920-17',
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
      image: 'assets/nakayama-dirt.png?v=20260920-17',
      distances: [
        {distance: 1000}, {distance: 1200}, {distance: 1700},
        {distance: 1800}, {distance: 2400}, {distance: 2500}
      ]
    }
  };

  // Geometry authority: JRA Nakayama course plan and inner/outer elevation diagrams.
  // Only JRA-published figures are numeric; other boundaries deliberately use course positions.
  const COURSE_SKELETONS = {
    '中山|芝|1200|外回り': [
      {label: '下り始動', range: 'START ～ 3コーナー手前', description: '2コーナー付近の外回りからスタート。下り勾配へ入りながら3コーナーへ向かう。', type: 'downhill'},
      {label: '外回り加速', range: '3コーナー ～ 直線入口', description: '大きな外回りのカーブを、下りながら4コーナーまで進む。', type: 'corner'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの短い直線。下り終点からゴール前の急坂へ移る。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '残180～残70付近の急坂（高低差2.2m）を上り、その先がGOAL。', type: 'goal'}
    ],
    '中山|芝|1600|外回り': [
      {label: '外回り合流', range: 'START ～ 2コーナー', description: '引込線の発走地点から外回り走路へ入り、ほどなくコーナーへ向かう。', type: 'corner'},
      {label: '長い下り', range: '2コーナー ～ 3コーナー', description: '最高地点付近から向正面へ。外回りを使って長く下る。', type: 'downhill'},
      {label: '外回り旋回', range: '3コーナー ～ 直線入口', description: '下りの流れのまま、大きな外回りの3～4コーナーを進む。', type: 'corner'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの直線へ。ホームストレッチ半ばの最深部から急坂へ移る。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '残180～残70付近の急坂（高低差2.2m）を上り、その先がGOAL。', type: 'goal'}
    ],
    '中山|芝|1800|内回り': [
      {label: '坂途中スタート', range: 'START ～ 1コーナー', description: 'ゴール前急坂の途中から発走。スタンド前を通り、最初のコーナーへ向かう。', type: 'uphill'},
      {label: '上り継続', range: '1コーナー ～ 2コーナー手前', description: 'ゴール地点から続く上りを進み、2コーナー手前の最高地点へ。', type: 'uphill'},
      {label: '下り加速', range: '2コーナー ～ 3コーナー', description: '最高地点から向正面へ、内回り走路を長く下る。', type: 'downhill'},
      {label: '高速小回り', range: '3コーナー ～ 直線入口', description: '下りの流れを保ちながら、タイトな内回りの3～4コーナーを処理。', type: 'corner'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの短い直線。ここからゴール前の急坂へ。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '残180～残70付近の急坂（高低差2.2m）を上り、その先がGOAL。', type: 'goal'}
    ],
    '中山|芝|2000|内回り': [
      {
        label: '上り負荷',
        range: 'START ～ 残1600',
        description: 'スタート直後に急坂を上り、最初のコーナーへ。',
        type: 'uphill'
      },
      {
        label: '下り加速',
        range: '残1600 ～ 残600',
        description: '1コーナーから向正面にかけて下りで加速。',
        type: 'downhill'
      },
      {
        label: '高速小回り',
        range: '残600 ～ 残310',
        description: '下りの勢いを保ったまま3～4コーナーのタイトな小回りを処理。',
        type: 'corner'
      },
      {
        label: '短い直線',
        range: '残310 ～ 残180',
        description: '310mの短い直線。ここからゴール前の急坂へ。',
        type: 'straight'
      },
      {
        label: '急坂・GOAL',
        range: '残180 ～ GOAL',
        description: 'ゴール前の急坂（高低差2.2m）。主な急勾配は残180～残70付近。そのまま上った先にGOAL。最後の踏ん張りが求められる。',
        type: 'goal'
      }
    ],
    '中山|芝|2200|外回り': [
      {label: '直線進入', range: 'START ～ 最初の急坂', description: '4コーナー寄りの発走地点から、最初のホームストレッチへ入る。', type: 'straight'},
      {label: '1回目の急坂', range: '最初の直線 ～ 1コーナー', description: '序盤でゴール前急坂を上り、GOAL板を通過して1コーナーへ。', type: 'uphill'},
      {label: '上り継続', range: '1コーナー ～ 2コーナー手前', description: '上り勾配を進み、2コーナー手前の最高地点へ。', type: 'uphill'},
      {label: '長い下り', range: '2コーナー ～ 直線入口', description: '外回りの向正面から大きな3～4コーナーまで、長い下りを進む。', type: 'downhill'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの短い直線。下り終点から再び急坂へ移る。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '2回目の急坂を上り、その先のGOALへ。', type: 'goal'}
    ],
    '中山|芝|2500|内回り': [
      {label: '外回りスタート', range: 'START ～ 最初の直線入口', description: '外回り走路上から発走。外側の3～4コーナーを通って最初の直線へ。', type: 'corner'},
      {label: '1回目の急坂', range: '最初の直線 ～ 1コーナー', description: '最初のホームストレッチで急坂を上り、GOAL板を通過して1コーナーへ。', type: 'uphill'},
      {label: '上り継続', range: '1コーナー ～ 2コーナー手前', description: '上り勾配を進み、2コーナー手前の最高地点へ。', type: 'uphill'},
      {label: '内回り下り', range: '2コーナー ～ 3コーナー', description: '2コーナーから内回りへ入り、向正面を長く下る。', type: 'downhill'},
      {label: '高速小回り', range: '3コーナー ～ 直線入口', description: '下りの流れのまま、タイトな内回りの3～4コーナーを処理。', type: 'corner'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの短い直線。ここから2回目の急坂へ。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '残180～残70付近の急坂を上り、その先がGOAL。', type: 'goal'}
    ],
    '中山|芝|2600|外回り': [
      {label: '外回りスタート', range: 'START ～ 最初の直線入口', description: '外回り走路上から発走。外側の3～4コーナーを通って最初の直線へ。', type: 'corner'},
      {label: '1回目の急坂', range: '最初の直線 ～ 1コーナー', description: '最初のホームストレッチで急坂を上り、GOAL板を通過して1コーナーへ。', type: 'uphill'},
      {label: '上り継続', range: '1コーナー ～ 2コーナー手前', description: '上り勾配を進み、2コーナー手前の最高地点へ。', type: 'uphill'},
      {label: '外回り下り', range: '2コーナー ～ 3コーナー', description: '最高地点から外回りの向正面へ入り、長く下る。', type: 'downhill'},
      {label: '外回り旋回', range: '3コーナー ～ 直線入口', description: '下りの流れのまま、大きな外回りの3～4コーナーを進む。', type: 'corner'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの短い直線。ここから2回目の急坂へ。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '残180～残70付近の急坂を上り、その先がGOAL。', type: 'goal'}
    ],
    '中山|芝|3200|外→内': [
      {label: '外回りスタート', range: 'START ～ 外回り合流', description: '外回り側の発走地点から、最初の外回り走路へ入る。', type: 'corner'},
      {label: '外回り下り', range: '外回り ～ 最初の直線', description: '外回りの長い下りと大きな3～4コーナーを通り、最初の直線へ。', type: 'downhill'},
      {label: '1回目の急坂', range: '最初の直線 ～ 1コーナー', description: '急坂を上ってGOAL板を通過し、1コーナーへ向かう。', type: 'uphill'},
      {label: '上り継続', range: '1コーナー ～ 2コーナー手前', description: '上り勾配を進み、2コーナー手前の最高地点へ。', type: 'uphill'},
      {label: '外→内切替', range: '2コーナー付近', description: '2コーナーで分岐する走路を、外回りから内回りへ切り替える。', type: 'corner'},
      {label: '内回り下り', range: '2コーナー ～ 3コーナー', description: '内回りの向正面を長く下り、タイトな3コーナーへ。', type: 'downhill'},
      {label: '高速小回り', range: '3コーナー ～ 直線入口', description: '下りの流れのまま、内回りの3～4コーナーを処理。', type: 'corner'},
      {label: '短い直線', range: '残310 ～ 残180', description: '310mの短い直線。ここから2回目の急坂へ。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '残180～残70付近の急坂を上り、その先がGOAL。', type: 'goal'}
    ],
    '中山|芝|3600|内回り': [
      {label: '1回目の急坂', range: 'START ～ 最初のGOAL板', description: 'ホームストレッチから発走し、すぐに急坂を上って最初のGOAL板を通過。', type: 'uphill'},
      {label: '1周目上り', range: '1コーナー ～ 2コーナー手前', description: '内回りの1コーナーから、最高地点まで上り続ける。', type: 'uphill'},
      {label: '1周目下り・小回り', range: '2コーナー ～ 1回目の直線', description: '長い下りから、内回りのタイトな3～4コーナーを経て直線へ。', type: 'downhill'},
      {label: '2回目の急坂', range: '1回目の直線 ～ 2回目のGOAL板', description: '310mの直線から、2回目の急坂を上ってGOAL板を通過。', type: 'goal'},
      {label: '2周目上り', range: '1コーナー ～ 2コーナー手前', description: '再び内回りの上りを進み、最高地点へ。', type: 'uphill'},
      {label: '2周目下り・小回り', range: '2コーナー ～ 最終直線', description: '長い下りから、最後の内回り3～4コーナーを処理。', type: 'corner'},
      {label: '最終直線', range: '残310 ～ 残180', description: '3回目のホームストレッチ。310mの短い直線から急坂へ。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '3回目の急坂を上り、その先のGOALへ。', type: 'goal'}
    ],
    '中山|芝|4000|外回り': [
      {label: '1回目の急坂', range: 'START ～ 最初のGOAL板', description: '4コーナー寄りから発走。最初の直線と急坂を通ってGOAL板を通過。', type: 'uphill'},
      {label: '1周目上り', range: '1コーナー ～ 2コーナー手前', description: '外回りの1コーナーから、最高地点まで上り続ける。', type: 'uphill'},
      {label: '1周目長い下り', range: '2コーナー ～ 1回目の直線', description: '外回りの長い下りと大きな3～4コーナーを通って直線へ。', type: 'downhill'},
      {label: '2回目の急坂', range: '1回目の直線 ～ 2回目のGOAL板', description: '310mの直線から、2回目の急坂を上ってGOAL板を通過。', type: 'goal'},
      {label: '2周目上り', range: '1コーナー ～ 2コーナー手前', description: '再び外回りの上りを進み、最高地点へ。', type: 'uphill'},
      {label: '2周目長い下り', range: '2コーナー ～ 最終直線', description: '外回りの長い下りから、最後の大きな3～4コーナーへ。', type: 'downhill'},
      {label: '最終直線', range: '残310 ～ 残180', description: '3回目のホームストレッチ。310mの短い直線から急坂へ。', type: 'straight'},
      {label: '急坂・GOAL', range: '残180 ～ GOAL', description: '3回目の急坂を上り、その先のGOALへ。', type: 'goal'}
    ]
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

  function renderStructure(row) {
    const key = `${row.racecourse}|${row.surface}|${Number(row.distance)}|${row.course}`;
    const phases = COURSE_SKELETONS[key] || (Array.isArray(row.course_structure?.phases) ? row.course_structure.phases : []);
    renderPhases(phases);
  }

  function renderPhases(phases) {
    $('courseStructure').innerHTML = phases.map((phase, index) => {
      const range = typeof phase.range === 'string' ? phase.range : `${phase.range?.from || ''} ～ ${phase.range?.to || ''}`;
      return `<article class="structure-phase phase-${esc(phase.type || 'default')}" role="listitem"><span class="phase-index">${String(index + 1).padStart(2, '0')}</span><h3>${esc(phase.label)}</h3><div class="phase-range">${esc(range)}</div><p>${esc(phase.description)}</p></article>`;
    }).join('');
  }

  function toggleResearchSections(showCompletedResearch) {
    $('researchSummary').classList.toggle('hidden', !showCompletedResearch);
    $('researchMovementBlock').classList.toggle('hidden', !showCompletedResearch);
    $('hypothesisStep').classList.toggle('hidden', !showCompletedResearch);
    $('analysisStep').classList.toggle('hidden', !showCompletedResearch);
    $('factsCard').classList.toggle('hidden', !showCompletedResearch);
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
    toggleResearchSections(true);
    $('researchDetail').classList.remove('hidden');
    $('researchEmpty').classList.add('hidden');
    $('researchStatus').textContent = row.status || '仮説';
    $('researchTitle').textContent = row.title;
    $('researchDate').textContent = row.researched_at ? `研究日 ${row.researched_at}` : '';
    $('researchCondition').innerHTML = [row.racecourse, row.surface, `${row.distance}m`, row.course].map(value => `<span>${esc(value)}</span>`).join('');
    $('researchSummary').textContent = row.summary || '';
    renderStructure(row);
    list('researchRequirements', row.requirements);
    renderIdealBody(row.ideal_body_hypothesis || {});
    renderAnalysis(row.analysis || {});
    list('researchFacts', row.facts);
    $('officialSource').href = row.official_source_url || 'https://www.jra.go.jp/facilities/race/nakayama/course/';
    document.querySelectorAll('.distance-button').forEach(button => button.classList.toggle('active', String(button.dataset.id) === String(row.id)));
    $('researchDetail').scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function renderSkeletonDetail(distance, course, phases) {
    toggleResearchSections(false);
    $('researchDetail').classList.remove('hidden');
    $('researchEmpty').classList.add('hidden');
    $('researchStatus').textContent = 'コース骨格';
    $('researchTitle').textContent = `中山｜芝｜${distance}m｜${course}`;
    $('researchDate').textContent = '';
    $('researchCondition').innerHTML = ['中山', '芝', `${distance}m`, course].map(value => `<span>${esc(value)}</span>`).join('');
    renderPhases(phases);
    document.querySelectorAll('.distance-button').forEach(button => button.classList.toggle('active', Number(button.dataset.distance) === distance && button.dataset.course === course));
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
    const distance = Number(button.dataset.distance);
    const course = button.dataset.course;
    const skeleton = COURSE_SKELETONS[`中山|芝|${distance}|${course}`];
    const row = rows.find(candidate => String(candidate.id) === button.dataset.id);
    const isApprovedTemplate = row && row.racecourse === '中山' && row.surface === '芝' && Number(row.distance) === 2000 && row.course === '内回り';
    if (isApprovedTemplate) {
      renderDetail(row);
      return;
    }
    if (skeleton) {
      renderSkeletonDetail(distance, course, skeleton);
      return;
    }
    $('researchDetail').classList.add('hidden');
    $('researchEmpty').classList.remove('hidden');
    $('researchEmpty').textContent = button.dataset.distance === '3200' ? '3200m 外→内は研究未確定です。' : `${button.dataset.distance}m は研究未確定です。`;
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
