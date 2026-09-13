(() => {
  const $ = (id) => document.getElementById(id);
  const JRA = new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  let layoutMasters = {};
  let loaded = false;

  function key() {
    const racecourse = $('racecourse')?.value || '';
    const surface = $('surface')?.value || '';
    const distance = $('distance')?.value || '';
    return `${racecourse}:${surface}:${distance}`;
  }

  function buildOptions(values, selected = '') {
    const select = $('course');
    if (!select) return;
    select.innerHTML = values.map(v => `<option value="${v.replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}"${v === selected ? ' selected' : ''}>${v}</option>`).join('');
  }

  function apply() {
    if (!loaded) return;
    const racecourse = $('racecourse')?.value || '';
    const surface = $('surface')?.value || '';
    const select = $('course');
    if (!select || !racecourse || !surface) return;

    const values = layoutMasters[key()] || [];
    if (!JRA.has(racecourse) || surface !== '芝' || values.length === 0) return;

    const current = select.value;
    if (values.length === 1) {
      buildOptions(values, values[0]);
      select.disabled = true;
      select.required = true;
    } else {
      buildOptions(values, values.includes(current) ? current : '');
      select.disabled = false;
      select.required = true;
      if (!select.value) select.insertAdjacentHTML('afterbegin', '<option value="">選択</option>');
    }
  }

  async function load() {
    if (!window.supabase || !window.CPL_SUPABASE_URL || !window.CPL_SUPABASE_KEY) return;
    try {
      const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
      const { data, error } = await client.from('master_options')
        .select('field_key,option_value,sort_order')
        .eq('category','COURSE_DISTANCE')
        .eq('active',true)
        .order('sort_order');
      if (error) throw error;
      layoutMasters = {};
      (data || []).forEach(row => {
        (layoutMasters[row.field_key] ||= []).push(row.option_value);
      });
      loaded = true;
      apply();
    } catch (err) {
      console.warn('コース形態Master読み込み失敗', err);
    }
  }

  document.addEventListener('change', (e) => {
    if (e.target?.id === 'racecourse' || e.target?.id === 'surface' || e.target?.id === 'distance') {
      window.setTimeout(apply, 0);
    }
  });
  window.setTimeout(load, 250);
  window.setInterval(() => {
    if (loaded && $('inputView') && !$('inputView').classList.contains('hidden')) apply();
  }, 1000);
})();
