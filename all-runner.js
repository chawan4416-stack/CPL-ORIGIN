(() => {
  'use strict';
  const core = window.CPLAllRunnerCore;
  const content = document.getElementById('arContent');
  const status = document.getElementById('arStatus');
  const login = document.getElementById('arLogin');
  const logout = document.getElementById('arLogout');
  const devRef = 'kczisspagwqzdvaeemir';
  const config = window.CPL_BETA_CONFIG;
  const configOK = config?.projectRef === devRef &&
    config.url === `https://${devRef}.supabase.co` &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey || '');
  if (!configOK || !window.supabase || !core) {
    login.disabled = true;
    status.textContent = 'CPL-DEV設定を確認できません。接続を停止しました。';
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { storageKey:`cpl-dev-${devRef}-all-runner-beta-auth` }
  });
  function showAuth(signedIn) {
    login.classList.toggle('hidden', signedIn);
    logout.classList.toggle('hidden', !signedIn);
  }
  login.addEventListener('click', async () => {
    login.disabled = true;
    try {
      const {error} = await client.auth.signInWithOAuth({provider:'google',
        options:{redirectTo:window.location.origin + window.location.pathname}});
      if (error) throw error;
    } catch (error) { status.textContent = `CPL-DEVログイン失敗: ${error.message}`; }
    finally { login.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    const {error} = await client.auth.signOut();
    if (error) status.textContent = `CPL-DEVログアウト失敗: ${error.message}`;
  });
  const fields = [
    ['chest','胸前','CHEST',true], ['hindquarter','トモ','HINDQUARTER',true],
    ['tone','ハリ','TONE',true], ['gait','歩様','GAIT',true],
    ['balance','前後バランス','BALANCE',true], ['flank_tuck','膁部のくびれ','FLANK_TUCK',true],
    ['agitation','イレ込み','AGITATION',false], ['sweating','発汗','SWEATING',false],
    ['fast_walking','早歩き','FAST_WALKING',false]
  ];
  const state = {
    user:null, masters:{}, view:'list', mode:'new', busy:false, race:null,
    raceId:null, revisionNo:null, evaluation:null, runners:[], currentHorse:1,
    outcomes:[], resultStatus:'official', history:[], historyNo:1, historyRunners:[],
    records:[], analysisAxis:'initial', analysisSnapshots:{}, analysisOutcomes:[]
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const values = key => (state.masters[key] || []).map(m => m.option_value);
  function options(list, selected, placeholder = '選択') {
    return `<option value="">${placeholder}</option>` + list.map(value =>
      `<option value="${esc(value)}"${String(value) === String(selected) ? ' selected' : ''}>${esc(value)}</option>`).join('');
  }
  function note(message) { status.textContent = message || ''; }
  function setView(view) { state.view = view; render(); window.scrollTo(0,0); persistDraft(); }
  const fieldSize = () => Number(state.race?.field_size || 0);
  function draftKey(suffix = state.raceId || 'new') {
    return state.user ? `CPL_DEV_${devRef}_ALL_RUNNER_BETA_DRAFT_${state.user.id}_${suffix}` : null;
  }
  const resultDraftKey = () => state.raceId && state.user ?
    `CPL_DEV_${devRef}_ALL_RUNNER_BETA_RESULTS_${state.user.id}_${state.raceId}` : null;
  function readLocal(key) {
    if (!key) return null;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }
  function persistDraft() {
    if (!state.user) return;
    try {
      if (['race','runners','suitable','focus','confirm'].includes(state.view)) {
        localStorage.setItem(draftKey(),JSON.stringify({ version:3, mode:state.mode,
          view:state.view, race:state.race, raceId:state.raceId,
          revisionNo:state.revisionNo, runners:state.runners,
          currentHorse:state.currentHorse, savedAt:new Date().toISOString() }));
      } else if (state.view === 'outcomes' && resultDraftKey()) {
        localStorage.setItem(resultDraftKey(),JSON.stringify({ version:3,
          outcomes:state.outcomes,resultStatus:state.resultStatus }));
      }
    } catch (error) { note('端末内の下書きを保存できませんでした。空き容量を確認してください。'); console.warn(error); }
  }
  function clearDraft(key) { if (key) localStorage.removeItem(key); }
  function blankRace() {
    return {race_date:today(),racecourse:values('RACECOURSE')[0] || '',
      surface:values('SURFACE')[0] || '', distance:'', course:'', race_class:'',
      track_condition:values('TRACK_CONDITION')[0] || '',field_size:12,race_number:1};
  }
  function raceDistances() {
    const prefix = `COURSE_DISTANCE:${state.race.racecourse}:${state.race.surface}:`;
    const keys = Object.keys(state.masters).filter(k => k.startsWith(prefix))
      .map(k => Number(k.slice(prefix.length))).filter(Number.isFinite);
    const old = values(`DISTANCE:${state.race.racecourse}`).map(Number);
    return [...new Set(keys.length ? keys : old)].sort((a,b) => a-b);
  }
  function syncCourse() {
    const ds = raceDistances();
    if (!ds.includes(Number(state.race.distance))) state.race.distance = ds[0] || '';
    const matched = values(`COURSE_DISTANCE:${state.race.racecourse}:${state.race.surface}:${state.race.distance}`);
    const course = matched.length ? matched : values(`COURSE:${state.race.racecourse}`);
    if (!course.includes(state.race.course)) state.race.course = course[0] || '';
    const classes = values(`RACE_CLASS:${state.race.racecourse}`);
    if (!classes.includes(state.race.race_class)) state.race.race_class = '';
  }
  function resizeRunners() {
    const existing = new Map(state.runners.map(r => [r.horse_number,r]));
    state.runners = Array.from({length:fieldSize()}, (_,i) => existing.get(i+1) || core.emptyRunner(i+1));
    state.currentHorse = Math.min(Math.max(1,state.currentHorse),fieldSize());
  }
  async function checked(query) {
    const {data,error} = await query;
    if (error) throw error;
    return data;
  }
  async function loadMasters() {
    const data = await checked(client.from('master_options')
      .select('category,field_key,option_value,sort_order').eq('active',true).order('sort_order'));
    state.masters = {};
    for (const row of data) {
      (state.masters[row.field_key] ||= []).push(row);
      (state.masters[`${row.category}:${row.field_key}`] ||= []).push(row);
    }
  }
  async function loadList() {
    const [races, evaluations] = await Promise.all([
      checked(client.from('races').select('id,race_date,racecourse,race_number,surface,distance,course,field_size')
        .order('race_date',{ascending:false}).order('race_number',{ascending:false}).limit(100)),
      checked(client.from('race_evaluations').select('race_id,status,result_status,current_revision_no,result_review_started_at'))
    ]);
    const map = new Map(evaluations.map(e => [e.race_id,e]));
    state.records = races.filter(r => map.has(r.id)).map(r => ({...r,...map.get(r.id)}));
    setView('list');
  }
  async function openRace(raceId) {
    const [race,evaluation] = await Promise.all([
      checked(client.from('races').select('id,race_date,racecourse,race_number,surface,distance,course,race_class,track_condition,field_size')
        .eq('id',raceId).single()),
      checked(client.from('race_evaluations').select('*').eq('race_id',raceId).single())
    ]);
    state.race = race; state.raceId = raceId; state.evaluation = evaluation;
    state.revisionNo = evaluation.current_revision_no; state.mode = 'edit';
    state.runners = await checked(client.from('race_runner_evaluations').select('*')
      .eq('race_id',raceId).eq('revision_no',state.revisionNo).order('horse_number'));
    const [revisions,outcomes] = await Promise.all([
      checked(client.from('race_evaluation_revisions').select('revision_no,knowledge_state')
        .eq('race_id',raceId).order('revision_no')),
      checked(client.from('race_runner_outcomes').select('horse_number,outcome_status,finish_position')
        .eq('race_id',raceId))
    ]);
    const pre=[...revisions].reverse().find(r => r.knowledge_state === 'pre_review')?.revision_no || 1;
    const selected={initial:1,pre_review:pre,current:state.revisionNo};
    const snapshots=await Promise.all([...new Set(Object.values(selected))].map(async revision => [revision,
      await checked(client.from('race_runner_evaluations').select('*')
        .eq('race_id',raceId).eq('revision_no',revision).order('horse_number'))]));
    const byRevision=new Map(snapshots);
    state.analysisSnapshots=Object.fromEntries(Object.entries(selected).map(([axis,revision]) => [axis,byRevision.get(revision)]));
    state.analysisOutcomes=outcomes;
    state.currentHorse = 1;
    setView('detail');
  }
  function startNew() {
    state.raceId=null; state.evaluation=null; state.revisionNo=null; state.mode='new';
    const saved = readLocal(draftKey('new'));
    state.race = saved?.version === 3 && saved.race ? saved.race : blankRace();
    syncCourse();
    state.runners = saved?.version === 3 && Array.isArray(saved.runners) ? saved.runners : [];
    state.currentHorse = saved?.currentHorse || 1;
    resizeRunners();
    setView(saved?.view && ['race','runners','suitable','focus','confirm'].includes(saved.view) ? saved.view : 'race');
  }
  function render() {
    const body = {
      list:renderList, race:renderRace, runners:renderRunner, suitable:renderSuitable,
      focus:renderFocus, confirm:renderConfirm, detail:renderDetail,
      outcomes:renderOutcomes, history:renderHistory
    }[state.view];
    content.innerHTML = body ? body() : '';
  }
  function renderList() {
    return `<p class="ar-kicker">研究を始める</p><button type="button" class="primary wide" data-action="new">＋ 全頭評価を作成</button>
      <p class="ar-note">馬名・単勝オッズ・パドック総評は入力しません。旧方式のレースは従来画面に残ります。</p>
      <h2 class="ar-title">全頭評価したレース</h2>`+
      (state.records.length ? state.records.map(r => `<div class="card ar-record"><h2>${esc(r.race_date)} ${esc(r.racecourse)} ${esc(r.race_number)}R</h2>
        <p>${esc(r.surface)} ${esc(r.distance)}m・${esc(r.course)}／${esc(r.field_size)}頭 · ${r.result_status === 'void' ? '不成立' : r.result_status === 'official' ? '結果保存済み' : '結果未入力'}</p>
        <button class="ar-button" type="button" data-action="open" data-id="${esc(r.id)}">研究を見る</button></div>`).join('') :
        '<div class="card ar-note">まだ全頭評価したレースはありません。</div>');
  }
  function fieldSelect(prop,label,master,required,runner) {
    return `<label class="ar-field">${label}${!required ? '（任意）' : ''}<select data-runner="${prop}">
      ${options(values(master),runner[prop],required ? '選択' : '未入力')}</select></label>`;
  }
  function renderRace() {
    const r = state.race;
    const courseKey = `COURSE_DISTANCE:${r.racecourse}:${r.surface}:${r.distance}`;
    const layouts = values(courseKey).length ? values(courseKey) : values(`COURSE:${r.racecourse}`);
    return `<p class="ar-kicker">STEP 1 / 5　レース情報</p><div class="card"><h2>出走頭数まで決める</h2>
      <div class="ar-grid">
      <label class="ar-field">日付<input type="date" data-race="race_date" value="${esc(r.race_date)}"></label>
      <label class="ar-field">競馬場<select data-race="racecourse">${options(values('RACECOURSE'),r.racecourse)}</select></label>
      <label class="ar-field">芝・ダート<select data-race="surface">${options(values('SURFACE'),r.surface)}</select></label>
      <label class="ar-field">距離<select data-race="distance">${options(raceDistances(),r.distance)}</select></label>
      <label class="ar-field">コース形態<select data-race="course">${options(layouts,r.course)}</select></label>
      <label class="ar-field">競走条件<select data-race="race_class">${options(values(`RACE_CLASS:${r.racecourse}`),r.race_class)}</select></label>
      <label class="ar-field">馬場<select data-race="track_condition">${options(values('TRACK_CONDITION'),r.track_condition)}</select></label>
      <label class="ar-field">レース<select data-race="race_number">${options(Array.from({length:12},(_,i) => i+1),r.race_number)}</select></label>
      <label class="ar-field">出走頭数（馬番1〜N）<select data-race="field_size">${options(Array.from({length:18},(_,i) => i+1),r.field_size)}</select></label>
      </div></div><p class="ar-note">既存マスターの競馬場・コース・距離だけを選択できます。出走取消は馬番を詰めません。</p>
      <div class="ar-footer"><button class="primary" type="button" data-action="race-next">馬番ごとの評価へ</button></div>`;
  }
  function renderRunner() {
    const r = state.runners[state.currentHorse-1];
    const count = state.runners.filter(core.complete).length;
    return `<p class="ar-kicker">STEP 2 / 5　全頭の馬体を観察</p>
      <h2 class="ar-title">${esc(state.race.racecourse)} ${esc(state.race.surface)} ${esc(state.race.distance)}m ｜${count}/${fieldSize()}頭</h2>
      <nav class="ar-numbers" aria-label="馬番を選択">${state.runners.map(x =>
        `<button type="button" class="ar-chip ${x.horse_number === r.horse_number ? 'active' : ''} ${core.complete(x) ? 'complete' : ''} ${x.entry_status === 'scratched' ? 'scratched' : ''} ${x.is_focus ? 'focus' : ''}"
          data-action="horse" data-number="${x.horse_number}" aria-label="${x.horse_number}番 ${core.complete(x) ? '入力済み' : '未入力'}">${x.horse_number}</button>`).join('')}</nav>
      <div class="card"><h2>${r.horse_number}番　${r.entry_status === 'scratched' ? '出走取消' : core.complete(r) ? '入力済み' : '未入力'}</h2>
      <button type="button" class="ar-button ${r.entry_status === 'scratched' ? 'selected' : ''}" data-action="scratch">${r.entry_status === 'scratched' ? '取消を解除' : '出走取消（確認後）'}</button>
      ${r.entry_status === 'scratched' ? '<p class="ar-note">取消馬は馬体の必須入力を免除します。</p>' :
        `<div class="ar-grid">${fields.map(f => fieldSelect(...f,r)).join('')}</div>`}</div>
      <div class="ar-actions"><button class="ar-button" type="button" data-action="runner-back">${state.mode === 'edit' ? '研究詳細' : 'レース情報'}</button>
      <button class="ar-button" type="button" data-action="next-unfilled">次の未入力</button></div>
      <div class="ar-footer"><button class="primary" type="button" data-action="runner-next">適性馬を選ぶ</button></div>`;
  }
  function renderSuitable() {
    const selected = state.runners.filter(r => r.is_suitable).map(r => r.horse_number);
    return `<p class="ar-kicker">STEP 3 / 5　レース結果を見る前の判断</p>
      <div class="card"><h2>適性馬体だと感じた馬</h2><p class="ar-note">複数選択可。選ばない判断も記録します。</p>
      <div class="ar-choice">${state.runners.filter(r => r.entry_status !== 'scratched').map(r =>
        `<button class="ar-chip ${r.is_suitable ? 'selected' : ''}" data-action="suitable" data-number="${r.horse_number}" type="button">${r.horse_number}番</button>`).join('')}</div>
      <p class="ar-note">${selected.length ? `選択：${selected.join('・')}番` : '適性馬なし'}</p></div>
      <div class="ar-actions"><button class="ar-button" data-action="back-runners">全頭の評価へ</button></div>
      <div class="ar-footer"><button class="primary" data-action="suitable-next">注目の1頭へ</button></div>`;
  }
  function renderFocus() {
    const selected = state.runners.filter(r => r.is_suitable && r.entry_status !== 'scratched');
    const focused = state.runners.find(r => r.is_focus);
    return `<p class="ar-kicker">STEP 4 / 5　注目の1頭</p><div class="card"><h2>特に抜けていると感じた馬</h2>
      <p class="ar-note">適性馬から最大1頭。注目馬なしも正式な判断です。</p>
      <div class="ar-choice"><button class="ar-button ${!focused ? 'selected' : ''}" data-action="focus" data-number="0">注目馬なし</button>
      ${selected.map(r => `<button class="ar-chip ${r.is_focus ? 'selected' : ''}" data-action="focus" data-number="${r.horse_number}">${r.horse_number}番</button>`).join('')}</div></div>
      <div class="ar-actions"><button class="ar-button" data-action="back-suitable">適性馬へ</button></div>
      <div class="ar-footer"><button class="primary" data-action="focus-next">判断を確認する</button></div>`;
  }
  function renderConfirm() {
    const picked = state.runners.filter(r => r.is_suitable).map(r => r.horse_number);
    const focus = state.runners.find(r => r.is_focus)?.horse_number;
    return `<p class="ar-kicker">STEP 5 / 5　${state.mode === 'new' ? '初回判断' : '修正判断'}</p>
      <div class="card ar-summary"><h2>結果を見る前に判断を保存</h2>
      <div>${esc(state.race.race_date)} ${esc(state.race.racecourse)} ${esc(state.race.race_number)}R／${fieldSize()}頭</div>
      <div>評価済み：${state.runners.filter(core.complete).length}頭</div>
      <div>適性馬：${picked.length ? picked.join('・')+'番' : 'なし'}</div>
      <div>注目馬：${focus ? focus+'番' : 'なし'}</div>
      <p class="ar-warning">${state.mode === 'new' ? '初回判断は後から上書きしません。訂正時は新しい完全スナップショットを追加します。' :
        state.evaluation?.result_review_started_at ? '結果確認後の修正です。事前判断の集計には含めません。' : '結果確認前の修正として保存します。'}</p>
      ${state.mode === 'edit' ? `<label class="ar-field">修正理由（任意）<textarea data-note rows="2">${esc(state.correctionNote || '')}</textarea></label>` : ''}
      </div><div class="ar-actions"><button class="ar-button" data-action="back-focus">注目馬を見直す</button></div>
      <div class="ar-footer"><button class="primary" data-action="confirm">${state.mode === 'new' ? '初回判断を確定' : '修正履歴として保存'}</button></div>`;
  }
  function renderDetail() {
    const e = state.evaluation;
    if (!e) return '<p>データを読み込めませんでした。</p>';
    const suitability = state.runners.filter(r => r.is_suitable).map(r => r.horse_number).join('・') || 'なし';
    const focus = state.runners.find(r => r.is_focus)?.horse_number || 'なし';
    const snapshot=state.analysisSnapshots[state.analysisAxis] || state.runners;
    const summary=core.summarize(snapshot,state.analysisOutcomes,e.result_status);
    const rate=item=>item.denominator ? `${item.numerator}/${item.denominator}頭` : '—（対象0頭）';
    return `<div class="card ar-record"><h2>${esc(state.race.race_date)} ${esc(state.race.racecourse)} ${esc(state.race.race_number)}R</h2>
      <p>${esc(state.race.surface)} ${esc(state.race.distance)}m・${esc(state.race.course)}／${state.race.field_size}頭</p>
      <div class="ar-badges"><span>評価 revision ${e.current_revision_no}</span><span>${e.result_status === 'void' ? 'レース不成立' : e.result_status === 'official' ? '公式結果保存済み' : '結果未入力'}</span></div>
      <p>現在の適性馬：${esc(suitability)}／注目馬：${esc(focus)}</p>
      ${e.result_review_started_at ? '<p class="ar-warning">結果確認を開始済み。これ以降の修正は事前判断には入りません。</p>' : ''}
      ${e.result_status === 'void' ? '<p class="ar-note">評価・修正履歴は残り、好走率の集計から除外されます。</p>' : ''}</div>
      <div class="card"><h2>このレースの判断照合</h2>
        <div class="ar-choice">${[['initial','初回判断'],['pre_review','結果前最新版'],['current','現在最新版']].map(([axis,label]) =>
          `<button class="ar-button ${state.analysisAxis === axis ? 'selected' : ''}" data-action="axis" data-value="${axis}">${label}</button>`).join('')}</div>
        ${summary ? `<p class="ar-note">公式3着以内 ${summary.topThree}頭（同着を含む）</p>
          <div class="ar-summary">適性馬 ${rate(summary.suitable)}<br>注目馬 ${rate(summary.focus)}<br>非選択馬 ${rate(summary.notSuitable)}</div>` :
          `<p class="ar-note">${e.result_status === 'void' ? '不成立：好走率の集計対象外' : '公式結果の入力後に照合できます。'}</p>`}
        ${state.analysisAxis === 'current' && e.result_review_started_at ? '<p class="ar-warning">結果確認後の修正を含む場合があります。事前判断の成績ではありません。</p>' : ''}
      </div>
      <div class="ar-actions"><button class="ar-button" data-action="edit">全頭評価を修正</button><button class="ar-button" data-action="history">修正履歴を見る</button></div>
      <div class="ar-footer"><button class="primary" data-action="review">人気・結果を確認／入力</button></div>`;
  }
  function renderOutcomes() {
    const isVoid = state.resultStatus === 'void';
    return `<p class="ar-kicker">確定後　人気・結果</p><div class="ar-warning">結果画面を開いた時刻をDBに記録済みです。以後の評価修正は事後判断です。</div>
      <div class="card"><h2>公式の結果状態</h2><div class="ar-choice"><button class="ar-button ${!isVoid ? 'selected' : ''}" data-action="result-status" data-value="official">公式結果あり</button>
      <button class="ar-button ${isVoid ? 'selected' : ''}" data-action="result-status" data-value="void">レース不成立</button></div></div>
      ${isVoid ? '<p class="ar-warning">公式にレース全体が不成立の場合だけ選択してください。全頭評価・履歴は保持し、好走率から除外します。</p>' :
        `<div class="card"><h2>全出走馬の人気と状態</h2><p class="ar-note">取消は人気不要、競走中止は人気必須。着順は次の欄で指定します。</p>
        ${state.outcomes.map(o => `<div class="ar-ranked"><h3>${o.horse_number}番</h3><div class="ar-grid">
          <label class="ar-field">出走状態<select data-outcome="status" data-number="${o.horse_number}" ${state.runners[o.horse_number-1].entry_status === 'scratched' ? 'disabled' : ''}>
            <option value="finished_other" ${['finished_other','placed'].includes(o.outcome_status) ? 'selected' : ''}>通常出走</option>
            <option value="dnf" ${o.outcome_status === 'dnf' ? 'selected' : ''}>競走中止</option>
            <option value="scratched" ${o.outcome_status === 'scratched' ? 'selected' : ''}>出走取消</option></select></label>
          ${o.outcome_status === 'scratched' ? '<p class="ar-note">出走取消・人気なし</p>' :
            `<label class="ar-field">単勝人気<select data-outcome="popularity" data-number="${o.horse_number}">
            ${options(Array.from({length:state.outcomes.filter(x => x.outcome_status !== 'scratched').length},(_,i) => i+1),o.popularity,'人気を選択')}</select></label>`}
          </div></div>`).join('')}</div>
        <div class="card"><h2>公式1〜3着（同着は複数選択）</h2><p class="ar-note">JRAの公式着順をそのまま指定。欠番の順位は空欄にします。</p>
          ${[1,2,3].map(rank => `<div class="ar-ranked"><h3>${rank}着：${state.outcomes.filter(o => o.finish_position === rank).length}頭</h3>
            <div class="ar-choice">${state.outcomes.filter(o => !['scratched','dnf'].includes(o.outcome_status)).map(o =>
              `<button type="button" class="ar-chip ${o.finish_position === rank ? 'selected' : ''}" data-action="rank" data-rank="${rank}" data-number="${o.horse_number}">${o.horse_number}番</button>`).join('')}</div></div>`).join('')}</div>`}
      <div class="ar-footer"><button class="primary" data-action="save-outcomes">${isVoid ? '不成立として保存' : '公式の人気・結果を保存'}</button></div>`;
  }
  function renderHistory() {
    const current = state.history.find(r => r.revision_no === state.historyNo);
    return `<p class="ar-kicker">修正履歴（完全スナップショット）</p>
      <div class="card"><h2>保存した判断を時点ごとに表示</h2>
      <p class="ar-note">初回／結果確認前の最新版／現在の最新版は別々に参照します。</p>
      ${state.history.map(rev => `<div class="ar-history"><button class="ar-button ${rev.revision_no === state.historyNo ? 'selected' : ''}"
        data-action="history-revision" data-number="${rev.revision_no}">revision ${rev.revision_no}・${rev.knowledge_state === 'pre_review' ? '結果確認前' : '結果確認後'}</button>
        <small>${esc(new Date(rev.created_at).toLocaleString('ja-JP'))} ${esc(rev.correction_note || '')}</small></div>`).join('')}</div>
      ${current ? `<div class="card"><h2>revision ${current.revision_no} の全頭判断</h2>
        <p>適性馬${current.no_suitable_horse ? 'なし' : 'あり'}／注目馬${current.no_focus_horse ? 'なし' : 'あり'}</p>
        ${state.historyRunners.map(r => `<p class="ar-note">${r.horse_number}番 ${r.entry_status === 'scratched' ? '出走取消' :
          `${esc(r.chest)}・${esc(r.hindquarter)}・${esc(r.tone)}・${esc(r.gait)}・${esc(r.balance)}・膁部${esc(r.flank_tuck)}`}
          ${r.is_suitable ? '｜適性' : ''}${r.is_focus ? '｜注目' : ''}</p>`).join('')}</div>` : ''}
      <button class="ar-button" data-action="back-detail">研究詳細へ</button>`;
  }
  function raceError() {
    const r = state.race;
    if (!r.race_date || !r.racecourse || !r.surface || !r.distance || !r.course ||
      !r.track_condition || !r.race_number || !r.field_size ||
      (values(`RACE_CLASS:${r.racecourse}`).length && !r.race_class))
      return 'レース情報をすべて入力してください。';
    return '';
  }
  function showError(error) {
    const message = String(error?.message || error || '不明なエラー');
    note(message.includes('STALE_REVISION') ? '別の端末で先に更新されました。再読込して履歴を確認してください。' :
      message.includes('RACE_ALREADY_EXISTS') ? 'この日・競馬場・レース番号は登録済みです。' : `保存・読込できませんでした：${message}`);
    console.error(error);
  }
  function normalizedRunners() {
    return state.runners.map(({horse_number,entry_status,chest,hindquarter,tone,gait,balance,
      flank_tuck,agitation,sweating,fast_walking,is_suitable,is_focus}) => ({
      horse_number,entry_status,chest:chest || null,hindquarter:hindquarter || null,
      tone:tone || null,gait:gait || null,balance:balance || null,flank_tuck:flank_tuck || null,
      agitation:agitation || null,sweating:sweating || null,fast_walking:fast_walking || null,
      is_suitable:Boolean(is_suitable),is_focus:Boolean(is_focus)
    }));
  }
  async function confirmEvaluation() {
    const validation = core.evaluationError(state.runners);
    if (validation) { note(validation); return; }
    persistDraft();
    const wasNew=state.mode === 'new';
    let response;
    if (state.mode === 'new') {
      response = await client.rpc('confirm_race_evaluation',{
        p_race:state.race,p_runners:normalizedRunners(),
        p_no_suitable:!state.runners.some(r => r.is_suitable),
        p_no_focus:!state.runners.some(r => r.is_focus)
      });
    } else {
      response = await client.rpc('revise_race_evaluation',{
        p_race_id:state.raceId,p_expected_revision:state.revisionNo,
        p_runners:normalizedRunners(),p_no_suitable:!state.runners.some(r => r.is_suitable),
        p_no_focus:!state.runners.some(r => r.is_focus),p_note:state.correctionNote || null
      });
    }
    if (response.error) throw response.error;
    const raceId = state.mode === 'new' ? response.data : state.raceId;
    clearDraft(draftKey());
    await openRace(raceId);
    note(wasNew ? '初回判断を保存しました。' : '完全スナップショットを保存しました。');
  }
  async function loadOutcomes() {
    const rows = await checked(client.from('race_runner_outcomes').select('*')
      .eq('race_id',state.raceId).order('horse_number'));
    const byNumber = new Map(rows.map(r => [r.horse_number,r]));
    state.outcomes = state.runners.map(r => byNumber.get(r.horse_number) || {
      horse_number:r.horse_number, outcome_status:r.entry_status === 'scratched' ? 'scratched' : 'finished_other',
      popularity:null,finish_position:null
    });
    state.resultStatus = state.evaluation.result_status || 'official';
    const saved = readLocal(resultDraftKey());
    if (saved?.version === 3 && Array.isArray(saved.outcomes) && saved.outcomes.length === fieldSize()) {
      state.outcomes=saved.outcomes; state.resultStatus=saved.resultStatus || 'official';
    }
    setView('outcomes');
  }
  async function startReview() {
    // Persist the irreversible server-side knowledge boundary before revealing the input.
    const {data,error} = await client.rpc('begin_result_review',{p_race_id:state.raceId});
    if (error) throw error;
    state.evaluation.result_review_started_at=data;
    await loadOutcomes();
  }
  async function saveOutcomes() {
    if (state.resultStatus === 'void') {
      if (!window.confirm('JRAでレース全体の不成立を確認しましたか？\n評価と修正履歴は維持し、好走率から除外します。')) return;
    } else {
      const validation = core.outcomeError(state.outcomes);
      if (validation) { note(validation); return; }
    }
    persistDraft();
    const {error} = await client.rpc('save_race_outcomes',{
      p_race_id:state.raceId,p_result_status:state.resultStatus,
      p_outcomes:state.resultStatus === 'void' ? null : state.outcomes.map(o => ({
        horse_number:o.horse_number, outcome_status:o.outcome_status,
        popularity:o.outcome_status === 'scratched' ? null : Number(o.popularity),
        finish_position:o.outcome_status === 'placed' ? Number(o.finish_position) : null
      }))
    });
    if (error) throw error;
    clearDraft(resultDraftKey());
    await openRace(state.raceId);
    note('結果を保存しました。初回評価と修正履歴は維持しています。');
  }
  async function loadHistory(number = 1) {
    state.history = await checked(client.from('race_evaluation_revisions')
      .select('revision_no,revision_kind,knowledge_state,no_suitable_horse,no_focus_horse,correction_note,created_at')
      .eq('race_id',state.raceId).order('revision_no'));
    state.historyNo=number;
    state.historyRunners = await checked(client.from('race_runner_evaluations').select('*')
      .eq('race_id',state.raceId).eq('revision_no',number).order('horse_number'));
    setView('history');
  }
  async function action(button) {
    const name = button.dataset.action;
    const number = Number(button.dataset.number);
    switch (name) {
      case 'new': startNew(); break;
      case 'open': await openRace(button.dataset.id); break;
      case 'race-next':
        if (raceError()) { note(raceError()); return; }
        resizeRunners(); setView('runners'); break;
      case 'horse': state.currentHorse=number; setView('runners'); break;
      case 'scratch': {
        const r=state.runners[state.currentHorse-1];
        if (r.entry_status === 'eligible' && !window.confirm(`${r.horse_number}番は出走取消ですか？`)) return;
        const scratch=r.entry_status === 'eligible';
        state.runners[state.currentHorse-1] = scratch ? {...core.emptyRunner(r.horse_number),entry_status:'scratched'} : core.emptyRunner(r.horse_number);
        setView('runners'); break;
      }
      case 'next-unfilled': {
        const unfilled=state.runners.find(r => !core.complete(r) && r.horse_number > state.currentHorse) || state.runners.find(r => !core.complete(r));
        state.currentHorse=unfilled?.horse_number || Math.min(fieldSize(),state.currentHorse+1);
        setView('runners'); break;
      }
      case 'runner-back': setView(state.mode === 'edit' ? 'detail' : 'race'); break;
      case 'runner-next':
        if (core.evaluationError(state.runners)) { note(core.evaluationError(state.runners)); return; }
        setView('suitable'); break;
      case 'suitable': {
        const r=state.runners[number-1]; r.is_suitable=!r.is_suitable;
        if (!r.is_suitable) r.is_focus=false;
        setView('suitable'); break;
      }
      case 'suitable-next': setView('focus'); break;
      case 'focus': state.runners.forEach(r => { r.is_focus=r.horse_number === number && r.is_suitable; }); setView('focus'); break;
      case 'focus-next': setView('confirm'); break;
      case 'back-runners': setView('runners'); break;
      case 'back-suitable': setView('suitable'); break;
      case 'back-focus': setView('focus'); break;
      case 'confirm': await confirmEvaluation(); break;
      case 'edit': {
        const draft=readLocal(draftKey());
        if (draft?.version === 3 && draft.revisionNo === state.revisionNo && Array.isArray(draft.runners))
          state.runners=draft.runners;
        state.correctionNote=''; state.currentHorse=1; setView('runners'); break;
      }
      case 'review': await startReview(); break;
      case 'axis': state.analysisAxis=button.dataset.value; render(); break;
      case 'result-status': state.resultStatus=button.dataset.value; setView('outcomes'); break;
      case 'rank': {
        const o=state.outcomes[number-1];
        if (['scratched','dnf'].includes(o.outcome_status)) return;
        const rank=Number(button.dataset.rank);
        o.finish_position=o.finish_position === rank ? null : rank;
        o.outcome_status=o.finish_position ? 'placed' : 'finished_other';
        setView('outcomes'); break;
      }
      case 'save-outcomes': await saveOutcomes(); break;
      case 'history': await loadHistory(1); break;
      case 'history-revision': await loadHistory(number); break;
      case 'back-detail': setView('detail'); break;
      default: break;
    }
  }
  content.addEventListener('click',async event => {
    const button=event.target.closest('[data-action]');
    if (!button || state.busy) return;
    note(''); state.busy=true; button.disabled=true;
    try { await action(button); } catch (error) { showError(error); }
    finally { state.busy=false; if (button.isConnected) button.disabled=false; }
  });
  content.addEventListener('input',event => {
    if (event.target.matches('[data-race="race_date"]')) state.race.race_date=event.target.value;
    if (event.target.matches('[data-note]')) state.correctionNote=event.target.value;
    persistDraft();
  });
  content.addEventListener('change',event => {
    const el=event.target;
    if (el.dataset.race) {
      state.race[el.dataset.race]=el.value;
      if (['racecourse','surface','distance'].includes(el.dataset.race)) { syncCourse(); render(); }
      if (el.dataset.race === 'field_size') {
        if (state.runners.some(r => r.horse_number > Number(el.value) &&
          (r.is_suitable || r.is_focus || r.entry_status === 'scratched' ||
            fields.some(([prop]) => Boolean(r[prop])))) &&
          !window.confirm('削る馬番に入力があります。下書きから除外しますか？')) {
          state.race.field_size=state.runners.length; render(); return;
        }
        resizeRunners();
      }
    } else if (el.dataset.runner) {
      state.runners[state.currentHorse-1][el.dataset.runner]=el.value || null;
    } else if (el.dataset.outcome) {
      const o=state.outcomes[Number(el.dataset.number)-1];
      if (el.dataset.outcome === 'popularity') o.popularity=el.value || null;
      else {
        o.outcome_status=el.value;
        if (el.value === 'scratched') { o.popularity=null; o.finish_position=null; }
        if (el.value === 'dnf' || el.value === 'finished_other') o.finish_position=null;
        render();
      }
    }
    persistDraft();
  });
  document.addEventListener('visibilitychange',() => { if (document.visibilityState === 'hidden') persistDraft(); });
  window.addEventListener('pagehide',persistDraft);
  window.addEventListener('beforeunload',persistDraft);
  let booting=false;
  async function boot(session) {
    if (!session || booting || state.user) return;
    booting=true; state.user=session.user; showAuth(true);
    try { await loadMasters(); await loadList(); note(''); }
    catch (error) { showError(error); content.innerHTML='<p class="ar-note">開発用DBへmigration 0022を適用してから検証してください。本番DBへは適用しません。</p>'; }
    finally { booting=false; }
  }
  client.auth.onAuthStateChange((event,session) => {
    if (event === 'SIGNED_OUT') {
      state.user=null; state.records=[]; showAuth(false);
      content.innerHTML='<p class="ar-note">全頭評価βの利用にはCPL-DEVでログインしてください。</p>';
    }
    if (event === 'SIGNED_IN' && session) void boot(session);
  });
  client.auth.getSession().then(({data,error}) => {
    if (error) { showError(error); return; }
    if (data.session) void boot(data.session);
    else { showAuth(false); content.innerHTML='<p class="ar-note">CPL-DEVでGoogleログインしてください。</p>'; }
  });
})();
