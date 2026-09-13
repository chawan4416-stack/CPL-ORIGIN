(() => {
  const $ = (id) => document.getElementById(id);
  let courseMasters = {};
  let courseDistanceMasters = {};
  let courseSelections = {};
  let loaded = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function courseDistanceKey() {
    return `${$('racecourse')?.value || ''}:${$('surface')?.value || ''}:${$('distance')?.value || ''}`;
  }

  function setCourseOptions(values, selected, { auto = false, includePlaceholder = false } = {}) {
    const select = $('course');
    const autoValue = $('courseAuto');
    if (!select) return;
    const previousValue = select.value;
    const previousDisabled = select.disabled;
    const options = [...(includePlaceholder ? [''] : []), ...values];
    select.innerHTML = options.map(value => `<option value="${esc(value)}">${value ? esc(value) : '選択'}</option>`).join('');
    select.value = values.includes(selected) ? selected : (includePlaceholder ? '' : (values[0] || ''));
    select.disabled = auto;
    select.required = true;
    select.dataset.courseExplicit = includePlaceholder && selected ? 'true' : 'false';
    if (autoValue) {
      autoValue.textContent = select.value;
      autoValue.classList.toggle('hidden', !auto);
      select.classList.toggle('hidden', auto);
    }

    if (previousValue !== select.value || previousDisabled !== select.disabled) {
      select.dataset.courseLayoutSync = 'true';
      select.dispatchEvent(new Event('change', { bubbles:true }));
      delete select.dataset.courseLayoutSync;
    }
  }

  function apply() {
    if (!loaded) return;
    const racecourse = $('racecourse')?.value || '';
    const surface = $('surface')?.value || '';
    const select = $('course');
    if (!select || !racecourse || !surface) return;

    const current = select.value;
    const layouts = courseDistanceMasters[courseDistanceKey()] || [];
    if (surface === '芝' && layouts.length > 0) {
      const selected = layouts.length === 1 ? current : (courseSelections[courseDistanceKey()] || '');
      setCourseOptions(layouts, selected, { auto: layouts.length === 1, includePlaceholder: layouts.length > 1 });
      return;
    }

    const standardCourses = courseMasters[racecourse] || [];
    if (standardCourses.length > 0) setCourseOptions(standardCourses, current);
  }

  async function load() {
    if (!window.supabase || !window.CPL_SUPABASE_URL || !window.CPL_SUPABASE_KEY) return;
    try {
      const client = window.supabase.createClient(window.CPL_SUPABASE_URL, window.CPL_SUPABASE_KEY);
      const { data, error } = await client.from('master_options')
        .select('category,field_key,option_value,sort_order')
        .in('category', ['COURSE', 'COURSE_DISTANCE'])
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;

      courseMasters = {};
      courseDistanceMasters = {};
      (data || []).forEach(row => {
        const target = row.category === 'COURSE_DISTANCE' ? courseDistanceMasters : courseMasters;
        (target[row.field_key] ||= []).push(row.option_value);
      });
      loaded = true;
      apply();
    } catch (err) {
      console.warn('コース形態Master読み込み失敗', err);
    }
  }

  document.addEventListener('change', event => {
    if (['racecourse', 'surface', 'distance'].includes(event.target?.id)) window.setTimeout(apply, 0);
    if (event.target?.id === 'course' && !event.target.dataset.courseLayoutSync) {
      const layouts = courseDistanceMasters[courseDistanceKey()] || [];
      if ($('surface')?.value === '芝' && layouts.length > 1) {
        if (layouts.includes(event.target.value)) {
          courseSelections[courseDistanceKey()] = event.target.value;
          event.target.dataset.courseExplicit = 'true';
        } else {
          delete courseSelections[courseDistanceKey()];
          event.target.dataset.courseExplicit = 'false';
        }
      }
    }
  });

  window.setTimeout(load, 250);
  window.setInterval(() => {
    if (loaded && $('inputView') && !$('inputView').classList.contains('hidden')) apply();
  }, 1000);
})();
