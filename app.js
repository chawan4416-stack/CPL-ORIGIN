(() => {
  const $ = (id) => document.getElementById(id);
  const views = ['loginView','homeView','inputView','masterView','savedView'];
  const bodyFields = [
    ['胸前','CHEST'],['トモ','HINDQUARTER'],['歩様','GAIT'],['前後バランス','BALANCE'],['ハリ','TONE'],['腹回り','ABDOMEN']
  ];
  const state = { masters: {}, saving: false };
  const hasConfig = window.CPL_SUPABASE_URL && !window.CPL_SUPABASE_URL.includes('YOUR_PROJECT') && window.CPL_SUPABASE_KEY && !window.CPL_SUPABASE_KEY.includes('YOUR_');
  if (!hasConfig) {
    $('configError').textContent = 'Supabase設定がまだ入っていません。';
    $('configError').classList.remove('hidden');
    $('login').disabled = true;
    return;
  }
  const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);

  function show(name) {
    views.forEach(v => $(v).classList.toggle('hidden', v !== name));
  }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function options(key, placeholder = '選択') {
    const values = state.masters[key] || [];
    return `<option value="">${placeholder}</option>` + values.map(v => `<option value="${esc(v.option_value)}">${esc(v.option_value)}</option>`).join('');
  }
  function buildResultCards() {
    $('resultCards').innerHTML = [1,2,3].map(pos => `
      <div class="card result-card" data-position="${pos}"><h2>${pos}着</h2>
        <div class="grid">
          <label>人気<input data-field="popularity" type="number" min="1" required></label>
          <label>単勝オッズ<input data-field="win_odds" type="number" min="0" step="0.1" required></label>
          ${bodyFields.map(([label,key]) => `<label>${label}<select data-field="${key}" required>${options(key)}</select></label>`).join('')}
        </div>
      </div>`).join('');
  }
  async function loadMasters() {
    const { data, error } = await client.from('master_options').select('category,field_key,option_value,sort_order').eq('active', true).order('sort_order');
    if (error) throw error;
    state.masters = {};
    data.forEach(row => (state.masters[row.field_key] ||= []).push(row));
    $('racecourse').innerHTML = options('RACECOURSE');
    $('surface').innerHTML = options('SURFACE');
    $('track_condition').innerHTML = options('TRACK_CONDITION');
    buildResultCards();
    renderMaster();
  }
  function renderMaster() {
    const keys = ['RACECOURSE','SURFACE','TRACK_CONDITION','CHEST','HINDQUARTER','GAIT','BALANCE','TONE','ABDOMEN'];
    $('masterList').innerHTML = keys.map(k => `<div class="card master-card"><h2>${esc(k)}</h2><div class="chips">${(state.masters[k] || []).map(x => `<span>${esc(x.option_value)}</span>`).join('')}</div></div>`).join('');
  }
  async function refreshStats() {
    const { count, error } = await client.from('races').select('*', { count:'exact', head:true });
    if (error) throw error;
    $('raceCount').textContent = count ?? 0;
    const { data, error: latestError } = await client.from('races').select('created_at').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (latestError) throw latestError;
    $('lastUpdate').textContent = data ? new Date(data.created_at).toLocaleDateString('ja-JP') : '—';
  }
  function collectResults() {
    return [...document.querySelectorAll('.result-card')].map(card => {
      const get = k => card.querySelector(`[data-field="${k}"]`).value;
      return { finish_position:Number(card.dataset.position), popularity:Number(get('popularity')), win_odds:Number(get('win_odds')), chest:get('CHEST'), hindquarter:get('HINDQUARTER'), gait:get('GAIT'), balance:get('BALANCE'), tone:get('TONE'), abdomen:get('ABDOMEN') };
    });
  }
  function validate(race, results) {
    if (Object.values(race).some(v => v === '' || v == null || Number.isNaN(v))) return 'レース情報をすべて入力してください。';
    if (!results.every(r => r.popularity > 0 && r.win_odds >= 0 && bodyFields.every(([,k]) => r[k]))) return '1〜3着の情報をすべて入力してください。';
    return '';
  }
  $('login').addEventListener('click', async () => {
    const { error } = await client.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:location.origin + location.pathname } });
    if (error) $('configError').textContent = error.message;
  });
  $('logout').addEventListener('click', () => client.auth.signOut());
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-screen]');
    if (!btn || btn.disabled) return;
    const screen = btn.dataset.screen;
    show(screen === 'home' ? 'homeView' : screen === 'input' ? 'inputView' : 'masterView');
    if (screen === 'input') $('race_date').value ||= new Date().toISOString().slice(0,10);
  });
  $('raceForm').addEventListener('submit', async e => {
    e.preventDefault(); if (state.saving) return;
    $('formError').textContent = '';
    const race = { race_date:$('race_date').value, racecourse:$('racecourse').value, race_number:$('race_number').value, course:$('course').value.trim(), surface:$('surface').value, distance:$('distance').value, track_condition:$('track_condition').value, field_size:$('field_size').value };
    const results = collectResults(); const error = validate(race, results);
    if (error) { $('formError').textContent = error; return; }
    state.saving = true; $('saveButton').disabled = true;
    try {
      const { error: saveError } = await client.rpc('save_race', { p_race:race, p_results:results });
      if (saveError) throw saveError;
      $('raceForm').reset(); show('savedView'); await refreshStats();
    } catch (err) { $('formError').textContent = '保存できませんでした。入力内容を確認してください。'; console.error(err); }
    finally { state.saving = false; $('saveButton').disabled = false; }
  });
  async function init() {
    const { data:{ session } } = await client.auth.getSession();
    if (!session) { show('loginView'); return; }
    $('logout').classList.remove('hidden');
    try { await loadMasters(); await refreshStats(); show('homeView'); }
    catch (err) { $('configError').textContent = `初期化に失敗しました。${err?.message || ''}`; $('configError').classList.remove('hidden'); console.error(err); }
  }
  client.auth.onAuthStateChange((_event, session) => { if (session) init(); });
  init();
})();