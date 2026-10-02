/* The suitability summary contains only recorded 1–3 finishers. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CPLSuitabilitySummary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const chestOrder = ['シャープ', '厚−', '厚', '重厚'];
  const hindOrder = ['シャープ−', 'シャープ', '厚−', '厚', '重厚−', '重厚'];
  const filterKeys = ['racecourse', 'surface', 'distance', 'course', 'track_condition'];
  const colors = Object.freeze({
    'シャープ−': '#94C6D9', 'シャープ': '#468FB4',
    '厚−': '#E8D78E', '厚': '#EAA54D',
    '重厚−': '#E7A0A8', '重厚': '#C95F70'
  });
  function summarize(rows) {
    const n = Number(rows[0]?.total || 0);
    const ranked = rows.filter(row => Number(row.observations) > 0).map(row => ({
      chest: row.chest, hindquarter: row.hindquarter,
      count: Number(row.observations), percentage: n ? Math.round(Number(row.observations) / n * 1000) / 10 : 0,
      tone: row.tone_breakdown || {}
    })).sort((a, b) => b.count - a.count ||
      chestOrder.indexOf(a.chest) - chestOrder.indexOf(b.chest) ||
      hindOrder.indexOf(a.hindquarter) - hindOrder.indexOf(b.hindquarter));
    return {n, ranked, top: ranked.slice(0, 3)};
  }
  function fromObservations(observations) {
    const n = observations.length;
    return chestOrder.flatMap(chest => hindOrder.map(hindquarter => {
      const matching = observations.filter(row => row.chest === chest && row.hindquarter === hindquarter);
      const tone_breakdown = Object.fromEntries(['パンパン', '普通', 'ゴム感', '未観察'].map(tone =>
        [tone, matching.filter(row => (row.tone || '未観察') === tone).length]));
      return {chest, hindquarter, observations: matching.length, total: n,
        percentage: n ? Math.round(matching.length / n * 1000) / 10 : 0, tone_breakdown};
    }));
  }
  const ready = filter => filterKeys.every(key => !!filter?.[key]);
  const sameFilters = (a, b) => !!a && !!b && filterKeys.every(key => String(a[key] ?? '') === String(b[key] ?? ''));
  const snapshot = filter => Object.fromEntries(filterKeys.map(key => [key, filter[key]]));
  return {colors, chestOrder, hindOrder, filterKeys, ready, sameFilters, snapshot, summarize, fromObservations};
});
