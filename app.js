(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['loginView','homeView','inputView','recordsView','masterView','savedView'];
  const bodyFields = [
    { label:'胸前', master:'CHEST', prop:'chest', required:true },
    { label:'トモ', master:'HINDQUARTER', prop:'hindquarter', required:true },
    { label:'歩様', master:'GAIT', prop:'gait', required:true },
    { label:'前後バランス', master:'BALANCE', prop:'balance', required:true },
    { label:'ハリ', master:'TONE', prop:'tone', required:true },
    { label:'イレ込み', master:'AGITATION', prop:'agitation', required:false },
    { label:'発汗', master:'SWEATING', prop:'sweating', required:false },
    { label:'パドック総評', master:'PADDOCK_EVALUATION', prop:'paddock_evaluation', required:true }
  ];
  const requiredBodyFields = bodyFields.filter(field => field.required);
  const state = {
    masters: {}, saving: false, initializing: false, initialized: false,
    deleting: false, userId: null, currentView: 'loginView', draftScrollTimer: null,
    draftRestoreTimer: null
  };
  const DRAFT_PREFIX = 'CPL_V1_INPUT_DRAFT_';
  const JRA_RACING_VIEWER_URL = 'https://prc.jp/';
  const JRA_RACECOURSES = new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  const hasConfig = window.CPL_SUPABASE_URL && !window.CPL_SUPABASE_URL.includes('YOUR_PROJECT') && window.CPL_SUPABASE_KEY && !window.CPL_SUPABASE_KEY.includes('YOUR_');
  if (!hasConfig) { $('configError').textContent = 'Supabase設定がまだ入っていません。'; $('configError').classList.remove('hidden'); $('login').disabled = true; return; }
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);

  function show(name) { views.forEach(v => $(v).classList.toggle('hidden', v !== name)); state.currentView = name; }
  function esc(v) { return String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
  function options(key, placeholder = '選択') { const values = state.masters[key] || []; return `<option value="">${placeholder}</option>` + values.map(v => `<option value="${esc(v.option_value)}">${esc(v.option_value)}</option>`).join(''); }
  function localDateString() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
  function resetInputDate() { $('race_date').value = localDateString(); }
  function buildSimpleOptions(select, values, selected = '') { select.innerHTML = values.map(v => `<option value="${esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${esc(v)}</option>`).join(''); }
  function buildRaceAndFieldSizeOptions() { buildSimpleOptions($('race_number'), Array.from({length:12}, (_,i) => i + 1), 1); buildSimpleOptions($('field_size'), Array.from({length:18}, (_,i) => i + 1), 12); }
  function buildPopularityOptions() { const fieldSize = Number($('field_size').value || 12); document.querySelectorAll('[data-field="popularity"]').forEach(el => { const current = Number(el.value || 1); el.innerHTML = Array.from({length: fieldSize}, (_, i) => i + 1).map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}番人気</option>`).join(''); }); }
  function buildOddsOptions() { document.querySelectorAll('.odds-int').forEach(el => { const current = Number(el.value || 1); el.innerHTML = Array.from({length:999}, (_,i) => i+1).map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}</option>`).join(''); }); document.querySelectorAll('.odds-dec').forEach(el => { const current = Number(el.value || 0); el.innerHTML = Array.from({length:10}, (_,i) => i).map(v => `<option value="${v}"${v === current ? ' selected' : ''}>.${v}</option>`).join(''); }); }
  function buildResultCards() {
    $('resultCards').innerHTML = [1,2,3].map(pos => `<div class="card result-card" data-position="${pos}"><h2>${pos}着</h2><div class="grid"><label>人気<select data-field="popularity" required></select></label><label>単勝オッズ<div class="odds-row"><select class="odds-int" data-field="win_odds_int" required></select><select class="odds-dec" data-field="win_odds_dec" required></select></div></label>${bodyFields.map(field => `<label>${field.label}<select data-field="${field.master}"${field.required ? ' required' : ''}>${options(field.master, field.required ? '選択' : '問題なし')}</select></label>`).join('')}</div></div>`).join('');
    buildPopularityOptions();
    buildOddsOptions();
  }
  function updateDistances() { const racecourse = $('racecourse').value; const surface = $('surface').value; const prefix = `COURSE_DISTANCE:${racecourse}:${surface}:`; const courseDistanceValues = [...new Set(Object.entries(state.masters).filter(([key]) => key.startsWith(prefix)).map(([key]) => Number(key.slice(prefix.length))).filter(Number.isFinite))].sort((a,b) => a-b); const values = courseDistanceValues.length ? courseDistanceValues : (state.masters[`DISTANCE:${racecourse}`] || []).map(v => Number(v.option_value)).sort((a,b) => a-b); const current = Number($('distance').value || 1600); const selected = values.includes(current) ? current : (values.includes(1600) ? 1600 : values[0]); buildSimpleOptions($('distance'), values, selected); $('distance').value = selected || ''; }
  function updateCourseOptions() { const values = (state.masters[`COURSE:${$('racecourse').value}`] || []).map(v => v.option_value); const current = $('course').value; buildSimpleOptions($('course'), values, values.includes(current) ? current : values[0]); }
  function updateRaceClassOptions() { const select = $('race_class'); const values = state.masters[`RACE_CLASS:${$('racecourse').value}`] || []; const current = select.value; select.required = values.length > 0; select.disabled = values.length === 0; select.innerHTML = values.length ? options(`RACE_CLASS:${$('racecourse').value}`, '選択') : '<option value="">未設定</option>'; select.value = values.some(v => v.option_value === current) ? current : ''; }
  async function loadMasters() { const { data, error } = await client.from('master_options').select('category,field_key,option_value,sort_order').eq('active', true).order('sort_order'); if (error) throw new Error(`Master読み込み失敗: ${error.message}`); state.masters = {}; data.forEach(row => { (state.masters[row.field_key] ||= []).push(row); (state.masters[`${row.category}:${row.field_key}`] ||= []).push(row); }); $('racecourse').innerHTML = options('RACECOURSE'); $('surface').innerHTML = options('SURFACE'); $('track_condition').innerHTML = options('TRACK_CONDITION'); buildRaceAndFieldSizeOptions(); buildResultCards(); updateDistances(); updateCourseOptions(); updateRaceClassOptions(); renderMaster(); }
  function renderMaster() { const keys = ['RACECOURSE','SURFACE','TRACK_CONDITION','CHEST','HINDQUARTER','GAIT','BALANCE','TONE','AGITATION','SWEATING','PADDOCK_EVALUATION']; const raceClasses = [...new Map(Object.entries(state.masters).filter(([key]) => key.startsWith('RACE_CLASS:')).flatMap(([, values]) => values).map(value => [value.option_value, value])).values()]; $('masterList').innerHTML = keys.map(k => `<div class="card master-card"><h2>${esc(k)}</h2><div class="chips">${(state.masters[k] || []).map(x => `<span>${esc(x.option_value)}</span>`).join('')}</div></div>`).join('') + (raceClasses.length ? `<div class="card master-card"><h2>RACE_CLASS</h2><div class="chips">${raceClasses.map(x => `<span>${esc(x.option_value)}</span>`).join('')}</div></div>` : ''); }
  async function refreshStats() { const { count, error } = await client.from('races').select('*', { count:'exact', head:true }); if (error) throw new Error(`レース件数取得失敗: ${error.message}`); $('raceCount').textContent = count ?? 0; const { data, error: latestError } = await client.from('races').select('updated_at').order('updated_at',{ascending:false}).limit(1).maybeSingle(); if (latestError) throw new Error(`最終更新取得失敗: ${latestError.message}`); $('lastUpdate').textContent = data ? new Date(data.updated_at).toLocaleDateString('ja-JP') : '—'; }
  function collectResults() {
    return [...document.querySelectorAll('.result-card')].map(card => {
      const get = k => card.querySelector(`[data-field="${k}"]`)?.value ?? '';
      return {
        finish_position:Number(card.dataset.position),
        popularity:Number(get('popularity')),
        win_odds:Number(`${get('win_odds_int')}.${get('win_odds_dec')}`),
        chest:get('CHEST'),
        hindquarter:get('HINDQUARTER'),
        gait:get('GAIT'),
        balance:get('BALANCE'),
        tone:get('TONE'),
        agitation:get('AGITATION') || null,
        sweating:get('SWEATING') || null,
        paddock_evaluation:get('PADDOCK_EVALUATION')
      };
    });
  }
  function validate(race, results) { if (Object.entries(race).filter(([key]) => key !== 'race_class').some(([,value]) => value === '' || value == null || Number.isNaN(value)) || ($('race_class').required && !race.race_class)) return 'レース情報をすべて入力してください。'; if (!results.every(r => r.popularity > 0 && r.win_odds >= 1 && requiredBodyFields.every(field => r[field.prop]))) return '1〜3着の情報をすべて入力してください。'; return ''; }
  async function findExistingRace(race) { const { data, error } = await client.from('races').select('id').eq('race_date', race.race_date).eq('racecourse', race.racecourse).eq('race_number', Number(race.race_number)).maybeSingle(); if (error) throw new Error(`既存レース確認失敗: ${error.message}`); return data?.id || null; }
  function renderPaddockLink(race) {
    if (!JRA_RACECOURSES.has(race.racecourse)) return '';
    const label = `${race.race_date} ${race.racecourse} ${race.race_number}RのJRAレーシングビュアー公式サイトを開く`;
    return `<a class="paddock-link" href="${JRA_RACING_VIEWER_URL}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}">🎥 パドックを見る</a>`;
  }
  async function loadRecords() { $('recordsError').textContent = ''; const { data, error } = await client.from('races').select('id,race_date,racecourse,race_number,course,surface,distance,race_class,track_condition,field_size').order('race_date',{ascending:false}).order('race_number',{ascending:false}).limit(50); if (error) throw new Error(`登録データ取得失敗: ${error.message}`); if (!data?.length) { $('recordsList').innerHTML = '<div class="card empty-records">登録済みレースはありません。</div>'; return; } $('recordsList').innerHTML = data.map(r => `<div class="card record-card"><div class="record-main"><strong>${esc(r.race_date)}　${esc(r.racecourse)} ${esc(r.race_number)}R</strong><span>${esc(r.surface)} ${esc(r.distance)}m・${esc(r.course)}${r.race_class ? `・${esc(r.race_class)}` : ''}・${esc(r.track_condition)}・${esc(r.field_size)}頭</span></div><div class="record-actions">${renderPaddockLink(r)}<button class="delete-button" data-delete-race="${esc(r.id)}" type="button">削除</button></div></div>`).join(''); }
  async function deleteRace(raceId) { if (state.deleting) return; const confirmed = window.confirm('このレースを削除しますか？\n\nこのレースの1〜3着データも削除されます。\n削除履歴は保存されません。'); if (!confirmed) return; state.deleting = true; $('recordsError').textContent = ''; try { const { error } = await client.rpc('delete_race', { p_race_id: raceId }); if (error) { if (error.message?.includes('RACE_NOT_FOUND')) throw new Error('このレースは見つかりません。'); throw error; } await loadRecords(); await refreshStats(); } catch (err) { $('recordsError').textContent = `削除できませんでした: ${err?.message || '不明なエラー'}`; console.error(err); } finally { state.deleting = false; } }
  function draftKey() { return state.userId ? `${DRAFT_PREFIX}${state.userId}` : null; }
  function readDraft() { const key = draftKey(); if (!key) return null; try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (err) { console.warn('下書き読み込み失敗', err); return null; } }
  function writeDraft() { if (!state.userId || state.currentView !== 'inputView') return; try { const draft = { version:2, screen:'inputView', saved_at:new Date().toISOString(), scrollY:window.scrollY, race:{ race_date:$('race_date').value, racecourse:$('racecourse').value, race_number:$('race_number').value, course:$('course').value, course_explicit:$('course').dataset.courseExplicit === 'true', surface:$('surface').value, distance:$('distance').value, race_class:$('race_class').value, track_condition:$('track_condition').value, field_size:$('field_size').value }, results:[...document.querySelectorAll('.result-card')].map(card => { const get = k => card.querySelector(`[data-field="${k}"]`)?.value ?? ''; return { popularity:get('popularity'), win_odds_int:get('win_odds_int'), win_odds_dec:get('win_odds_dec'), ...Object.fromEntries(bodyFields.map(field => [field.master,get(field.master)])) }; }) }; localStorage.setItem(draftKey(), JSON.stringify(draft)); } catch (err) { console.warn('下書き保存失敗', err); } }
  function clearDraft() { const key = draftKey(); if (!key) return; try { localStorage.removeItem(key); } catch (err) { console.warn('下書き削除失敗', err); } }
  function restoreDraft() { const draft = readDraft(); if (!draft?.race || ![1,2].includes(draft.version)) return false; const race = draft.race; $('race_date').value = race.race_date || localDateString(); $('racecourse').value = race.racecourse || ''; $('surface').value = race.surface || ''; $('track_condition').value = race.track_condition || ''; $('race_number').value = race.race_number || '1'; $('field_size').value = race.field_size || '12'; updateDistances(); updateCourseOptions(); updateRaceClassOptions(); $('distance').value = race.distance || $('distance').value; $('course').value = race.course || $('course').value; $('race_class').value = race.race_class || ''; if (race.course_explicit === true) $('course').dispatchEvent(new Event('change', { bubbles:true })); $('distance').dispatchEvent(new Event('change', { bubbles:true })); buildPopularityOptions(); buildOddsOptions(); (draft.results || []).slice(0,3).forEach((saved, index) => { const card = document.querySelector(`.result-card[data-position="${index + 1}"]`); if (!card) return; Object.entries(saved).forEach(([key,value]) => { const el = card.querySelector(`[data-field="${key}"]`); if (el && value !== undefined && value !== '') el.value = value; }); }); if (draft.scrollY > 0) { window.clearTimeout(state.draftRestoreTimer); state.draftRestoreTimer = window.setTimeout(() => window.scrollTo(0, draft.scrollY), 100); } return true; }

  $('login').addEventListener('click', async () => { const { error } = await client.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:location.origin + location.pathname } }); if (error) $('configError').textContent = `Googleログイン失敗: ${error.message}`; });
  $('logout').addEventListener('click', () => client.auth.signOut());
  $('racecourse').addEventListener('change', () => { updateDistances(); updateCourseOptions(); updateRaceClassOptions(); writeDraft(); });
  $('surface').addEventListener('change', () => { updateDistances(); writeDraft(); });
  $('field_size').addEventListener('change', () => { buildPopularityOptions(); writeDraft(); });
  document.addEventListener('input', writeDraft);
  document.addEventListener('change', writeDraft);
  window.addEventListener('scroll', () => {
    if (state.currentView !== 'inputView') return;
    window.clearTimeout(state.draftScrollTimer);
    state.draftScrollTimer = window.setTimeout(writeDraft, 200);
  }, { passive:true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') writeDraft(); });
  window.addEventListener('pagehide', writeDraft);
  window.addEventListener('beforeunload', writeDraft);
  document.addEventListener('click', async e => {
    const deleteButton = e.target.closest('[data-delete-race]');
    if (deleteButton) { await deleteRace(deleteButton.dataset.deleteRace); return; }
    const btn = e.target.closest('[data-screen]');
    if (!btn || btn.disabled) return;
    const screen = btn.dataset.screen;
    const nextView = screen === 'home' ? 'homeView' : screen === 'input' ? 'inputView' : screen === 'records' ? 'recordsView' : 'masterView';
    if (state.currentView === 'inputView' && nextView !== 'inputView') writeDraft();
    show(nextView);
    if (screen === 'input') {
      buildRaceAndFieldSizeOptions();
      updateDistances();
      updateCourseOptions();
      updateRaceClassOptions();
      buildPopularityOptions();
      buildOddsOptions();
      if (!restoreDraft()) resetInputDate();
      writeDraft();
    }
    if (screen === 'records') { try { await loadRecords(); } catch (err) { $('recordsError').textContent = `登録データを取得できませんでした: ${err?.message || '不明なエラー'}`; } }
  });
  $('raceForm').addEventListener('submit', async e => { e.preventDefault(); if (state.saving) return; $('formError').textContent = ''; const race = { race_date:$('race_date').value, racecourse:$('racecourse').value, race_number:$('race_number').value, course:$('course').value, surface:$('surface').value, distance:$('distance').value, race_class:$('race_class').value, track_condition:$('track_condition').value, field_size:$('field_size').value }; const results = collectResults(); const error = validate(race, results); if (error) { $('formError').textContent = error; return; } state.saving = true; $('saveButton').disabled = true; try { const existingRaceId = await findExistingRace(race); let raceId = null; if (existingRaceId) { const overwrite = window.confirm('このレースはすでに登録されています。\n現在の入力内容で上書きしますか？\n\n※変更履歴は保存されません。'); if (!overwrite) return; raceId = existingRaceId; } const { error: saveError } = await client.rpc('save_race', { p_race:race, p_results:results, p_race_id:raceId }); if (saveError) { if (saveError.message?.includes('DUPLICATE_RACE')) throw new Error('このレースはすでに登録されています。'); throw saveError; } clearDraft(); $('raceForm').reset(); show('savedView'); await refreshStats(); } catch (err) { $('formError').textContent = `保存できませんでした: ${err?.message || '不明なエラー'}`; console.error(err); } finally { state.saving = false; $('saveButton').disabled = false; } });
  async function init(sessionFromAuth = null) {
    if (state.initializing || state.initialized) return;
    state.initializing = true;
    const { data:{ session }, error: sessionError } = sessionFromAuth ? { data:{ session:sessionFromAuth }, error:null } : await client.auth.getSession();
    if (sessionError) { $('configError').textContent = `セッション取得失敗: ${sessionError.message}`; $('configError').classList.remove('hidden'); state.initializing = false; return; }
    if (!session) { state.userId = null; $('logout').classList.add('hidden'); show('loginView'); state.initializing = false; return; }
    state.userId = session.user.id;
    $('logout').classList.remove('hidden');
    try {
      await loadMasters();
      await refreshStats();
      $('configError').classList.add('hidden');
      const restored = readDraft();
      show(restored?.screen === 'inputView' ? 'inputView' : 'homeView');
      if (restored?.screen === 'inputView') restoreDraft();
      state.initialized = true;
    } catch (err) {
      $('configError').textContent = `初期化に失敗しました。${err?.message || '不明なエラー'}`;
      $('configError').classList.remove('hidden');
      console.error(err);
    } finally { state.initializing = false; }
  }
  client.auth.onAuthStateChange((event, session) => {
    // TOKEN_REFRESHED 等では画面と入力DOMを絶対に作り直さない。
    if (event === 'SIGNED_OUT') {
      state.userId = null;
      state.initialized = false;
      $('logout').classList.add('hidden');
      show('loginView');
      return;
    }
    if (event === 'SIGNED_IN' && session && !state.initialized) init(session);
  });
  init();
})();
