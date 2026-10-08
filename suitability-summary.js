/* The suitability summary contains only recorded 1–3 finishers. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CPLSuitabilitySummary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const chestOrder = ['シャープ', '厚', '重厚'];
  const hindOrder = ['シャープ', '厚', '重厚'];
  const densityOrder = ['充足', '未充足'];
  const textureOrder = ['標準', '張りあり', '弾力あり', '張りあり＋弾力あり'];
  function toggleTexture(current, selected) {
    if (selected === '標準') return current === '標準' ? null : '標準';
    const chosen = new Set(current && current !== '標準' ? current.split('＋') : []);
    if (chosen.has(selected)) chosen.delete(selected); else chosen.add(selected);
    return ['張りあり', '弾力あり'].filter(value => chosen.has(value)).join('＋') || null;
  }
  const complete = h => !!(h.popularity && chestOrder.includes(h.chest) && hindOrder.includes(h.hindquarter) && densityOrder.includes(h.hindquarter_density) && textureOrder.includes(h.hindquarter_texture));
  const filterKeys = ['racecourse', 'surface', 'distance', 'course', 'track_condition'];
  const colors = Object.freeze({
    'シャープ': '#468FB4',
    '厚': '#EAA54D',
    '重厚': '#C95F70'
  });
  function summarize(rows) {
    const n = Number(rows[0]?.total || 0);
    const ranked = rows.filter(row => Number(row.observations) > 0).map(row => ({
      chest: row.chest, hindquarter: row.hindquarter,
      count: Number(row.observations), percentage: n ? Math.round(Number(row.observations) / n * 1000) / 10 : 0,
      density: row.density_breakdown || {}, texture: row.texture_breakdown || {}
    })).sort((a, b) => b.count - a.count ||
      chestOrder.indexOf(a.chest) - chestOrder.indexOf(b.chest) ||
      hindOrder.indexOf(a.hindquarter) - hindOrder.indexOf(b.hindquarter));
    return {n, ranked, top: ranked.slice(0, 3)};
  }
  function fromObservations(observations) {
    const n = observations.length;
    return chestOrder.flatMap(chest => hindOrder.map(hindquarter => {
      const matching = observations.filter(row => row.chest === chest && row.hindquarter === hindquarter);
      const density_breakdown = Object.fromEntries(densityOrder.map(value => [value, matching.filter(row => row.hindquarter_density === value).length]));
      const texture_breakdown = Object.fromEntries(textureOrder.map(value => [value, matching.filter(row => row.hindquarter_texture === value).length]));
      return {chest, hindquarter, observations: matching.length, total: n,
        percentage: n ? Math.round(matching.length / n * 1000) / 10 : 0, density_breakdown, texture_breakdown};
    }));
  }
  function rankObservations(observations, maxFinish) {
    const selected = observations.filter(row => Number(row.finish_position) >= 1 && Number(row.finish_position) <= maxFinish);
    const n = selected.length;
    const rankAxis = (key, labels) => {
      const rows = labels.map(label => ({label, count: selected.filter(row => row[key] === label).length}));
      rows.sort((a, b) => b.count - a.count || labels.indexOf(a.label) - labels.indexOf(b.label));
      let rank = 0, previousCount;
      return rows.map((row, index) => {
        if (row.count !== previousCount) rank = index + 1;
        previousCount = row.count;
        return {...row, rank: n ? rank : null, percentage: n ? Math.round(row.count / n * 1000) / 10 : null};
      });
    };
    return {n, density: rankAxis('hindquarter_density', densityOrder), texture: rankAxis('hindquarter_texture', textureOrder)};
  }

  const ready = filter => filterKeys.every(key => !!filter?.[key]);
  const sameFilters = (a, b) => !!a && !!b && filterKeys.every(key => String(a[key] ?? '') === String(b[key] ?? ''));
  const snapshot = filter => Object.fromEntries(filterKeys.map(key => [key, filter[key]]));
  return {colors, chestOrder, hindOrder, densityOrder, textureOrder, toggleTexture, complete, filterKeys, ready, sameFilters, snapshot, summarize, fromObservations, rankObservations};
});
