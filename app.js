(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['loginView','homeView','inputView','masterView','savedView'];
  const bodyFields = [
    ['胸前','CHEST'],['トモ','HINDQUARTER'],['歩様','GAIT'],['前後バランス','BALANCE'],['ハリ','TONE'],['腹回り','ABDOMEN'],['パドック総評','PADDOCK_EVALUATION']
  ];
  const state = { masters: {}, saving: false, initializing: false };
  const hasConfig = window.CPL_SUPABASE_URL && !window.CPL_SUPABASE_URL.includes('YOUR_PROJECT') && window.CPL_SUPABASE_KEY && !window.CPL_SUPABASE_KEY.includes('YOUR_');
  if (!hasConfig) {
    $('configError').textContent = 'Supabase設定がまだ入っていません。';
    $('configError').classList.remove('hidden');
    $('login').disabled = true;
    return;
  }
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
  function show(name) { views.forEach(v => $(v).classList.toggle('hidden', v !== name)); }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function options(key, placeholder = '選択') {
    const values = state.masters[key] || [];
    return `<option value="">${placeholder}</option>` + values.map(v => `<option value="${esc(v.option_value)}">${esc(v.option_value)}</option>`).join('');
  }
  function localDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function resetInputDate() { $('race_date').value = localDateString(); }
  function buildSimpleOptions(select, values, selected = '') {
    select.innerHTML = values.map(v => `<option value="${esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${esc(v)}</option>`).join('');
  }
  function buildRaceAndFieldSizeOptions() {
    buildSimpleOptions($('race_number'), Array.from({length:12}, (_,i) => i + 1), 1);
    buildSimpleOptions($('field_size'), Array.from({length:18}, (_,i) => i + 1), 12);
  }
  function buildPopularityOptions() {
    const fieldSize = Number($('field_size').value || 12);
    document.querySelectorAll('[data-field="popularity"]').forEach(el => {
      const current = Number(el.value || 1);
      el.innerHTML = Array.from({length: fieldSize}, (_, i) => i + 1).map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}番人気</option>`).join('');
    });
  }
  function buildOddsOptions() {
    document.querySelectorAll('.odds-int').forEach(el => {
      const current = Number(el.value || 1);
      el.innerHTML = Array.from({length: 999}, (_, i) => i + 1).map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}</option>`).join('');
    });
    document.querySelectorAll('.odds-dec').forEach(el => {
      const current = Number(el.value || 0);
      el.innerHTML = Array.from({length: 10}, (_, i) => i).map(v => `<option value="${v}"${v === current ? ' selected' : ''}>.${v}</option>`).join('');
    });
  }
  function buildResultCards() {
    $('resultCards').innerHTML = [1,2,3].map(pos => `
      <div class="card result-card" data-position="${pos}"><h2>${pos}着</h2>
        <div class="grid">
          <label>人気<select data-field="popularity" required></select></label>
          <label>単勝オッズ<div class="odds-row"><select class="odds-int" data-field="win_odds_int" required></select><select class="odds-dec" data-field="win_odds_dec" required></select></div></label>
          ${bodyFields.map(([label,key]) => `<label>${label}<select data-field="${key}" required>${options(key)}</select></label>`).join('')}
        </div>
      </div>`).join('');
    buildPopularityOptions();
    buildOddsOptions();
  }
  function updateDistances() {
    const racecourse = $('racecourse').value;
    const values = (state.masters[`DISTANCE:${racecourse}`] || []).map(v => Number(v.option_value)).sort((a,b) => a-b);
    const current = Number($('distance').value || 1600);
    const selected = values.includes(current) ? current : (values.includes(1600) ? 1600 : values[0]);
    buildSimpleOptions($('distance'), values, selected);
    $('distance').value = selected || '';
  }
  function updateCourseOptions() {
    const values = state.masters[`COURSE:${$('racecourse').value}`] || [];
    const current = $('course').value;
    buildSimpleOptions($('course'), values, values.includes(current) ? current : values[0]);
  }
  async function loadMasters() {
    const { data, error } = await client.from('master_options').select('category,field_key,option_value,sort_order').eq('active', true).order('sort_order');
    if (error) throw new Error(`Master読み込み失敗: ${error.message}`);
    state.masters = {};
    data.forEach(row => {
      const key = row.category === 'DISTANCE' ? `DISTANCE:${row.field_key}` : row.category === 'COURSE' ? `COURSE:${row.field_key}` : row.field_key;
      (state.masters[key] ||= []).push(row);
    });
    $('racecourse').innerHTML = options('RACECOURSE');
    $('surface').innerHTML = options('SURFACE');
    $('track_condition').innerHTML = options('TRACK_CONDITION');
    buildRaceAndFieldSizeOptions();
    buildResultCards();
    updateDistances();
    updateCourseOptions();
    renderMaster();
  }
  function renderMaster() {
    const keys = ['RACECOURSE','SURFACE','TRACK_CONDITION','CHEST','HINDQUARTER','GAIT','BALANCE','TONE','ABDOMEN','PADDOCK_EVALUATION'];
    $('masterList').innerHTML = keys.map(k => `<div class="card master-card"><h2>${esc(k)}</h2><div class="chips">${(state.masters[k] || []).map(x => `<span>${esc(x.option_value)}</span>`).join('')}</div></div>`).join('');
  }
  async function refreshStats() {
    const { count, error } = await client.from('races').select('*', { count:'exact', head:true });
    if (error) throw new Error(`レース件数取得失敗: ${error.message}`);
    $('raceCount').textContent = count ?? 0;
    const { data, error: latestError } = await client.from('races').select('created_at').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (latestError) throw new Error(`最終更新取得失敗: ${latestError.message}`);
    $('lastUpdate').textContent = data ? new Date(data.created_at).toLocaleDateString('ja-JP') : '—';
  }
  function collectResults() {
    return [...document.querySelectorAll('.result-card')].map(card => {
      const get = k => card.querySelector(`[data-field="${k}"]`).value;
      return { finish_position:Number(card.dataset.position), popularity:Number(get('popularity')), win_odds:Number(`${get('win_odds_int')}.${get('win_odds_dec')}`), chest:get('CHEST'), hindquarter:get('HINDQUARTER'), gait:get('GAIT'), balance:get('BALANCE'), tone:get('TONE'), abdomen:get('ABDOMEN'), paddock_evaluation:get('PADDOCK_EVALUATION') };
    });
  }
  function validate(race, results) {
    if (Object.values(race).some(v => v === '' || v == null || Number.isNaN(v))) return 'レース情報をすべて入力してください。';
    if (!results.every(r => r.popularity > 0 && r.win_odds >= 1 && bodyFields.every(([,k]) => r[k]))) return '1〜3着の情報をすべて入力してください。';
    return '';
  }
  $('login').addEventListener('click', async () => {
    const { error } = await client.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:location.origin + location.pathname } });
    if (error) $('configError').textContent = `Googleログイン失敗: ${error.message}`;
  });
  $('logout').addEventListener('click', () => client.auth.signOut());
  $('racecourse').addEventListener('change', () => { updateDistances(); updateCourseOptions(); });
  $('field_size').addEventListener('change', buildPopularityOptions);
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-screen]');
    if (!btn || btn.disabled) return;
    const screen = btn.dataset.screen;
    show(screen === 'home' ? 'homeView' : screen === 'input' ? 'inputView' : 'masterView');
    if (screen === 'input') {
      resetInputDate();
      buildRaceAndFieldSizeOptions();
      updateDistances();
      updateCourseOptions();
      buildPopularityOptions();
    }
  });
  $('raceForm').addEventListener('submit', async e => {
    e.preventDefault(); if (state.saving) return;
    $('formError').textContent = '';
    const race = { race_date:$('race_date').value, racecourse:$('racecourse').value, race_number:$('race_number').value, course:$('course').value, surface:$('surface').value, distance:$('distance').value, track_condition:$('track_condition').value, field_size:$('field_size').value };
    const results = collectResults(); const error = validate(race, results);
    if (error) { $('formError').textContent = error; return; }
    state.saving = true; $('saveButton').disabled = true;
    try {
      const { error: saveError } = await client.rpc('save_race', { p_race:race, p_results:results });
      if (saveError) throw saveError;
      $('raceForm').reset(); show('savedView'); await refreshStats();
    } catch (err) { $('formError').textContent = `保存できませんでした: ${err?.message || '不明なエラー'}`; console.error(err); }
    finally { state.saving = false; $('saveButton').disabled = false; }
  });
  async function init() {
    if (state.initializing) return;
    state.initializing = true;
    const { data:{ session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      $('configError').textContent = `セッション取得失敗: ${sessionError.message}`;
      $('configError').classList.remove('hidden');
      state.initializing = false;
      return;
    }
    if (!session) { $('logout').classList.add('hidden'); show('loginView'); state.initializing = false; return; }
    $('logout').classList.remove('hidden');
    try {
      await loadMasters();
      await refreshStats();
      $('configError').classList.add('hidden');
      show('homeView');
    } catch (err) {
      $('configError').textContent = `初期化に失敗しました。${err?.message || '不明なエラー'}`;
      $('configError').classList.remove('hidden');
      console.error(err);
    } finally {
      state.initializing = false;
    }
  }
  client.auth.onAuthStateChange((_event, session) => { if (session) init(); });
  init();
})();
