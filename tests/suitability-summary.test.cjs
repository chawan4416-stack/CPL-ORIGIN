const test = require('node:test');
const assert = require('node:assert/strict');
const {summarize, fromObservations, colors, chestOrder, hindOrder, ready, sameFilters, snapshot} = require('../suitability-summary.js');

test('draft conditions stay separate from the confirmed search and require five valid values', () => {
  const draft={racecourse:'東京',surface:'芝',distance:'1600',course:'外回り',track_condition:'良'};
  assert.equal(ready(draft),true);
  const applied=snapshot(draft);
  draft.racecourse='中山';
  draft.course='';
  assert.equal(ready(draft),false);
  assert.equal(sameFilters(draft,applied),false);
  assert.equal(applied.racecourse,'東京');
  draft.course='右回り';
  assert.equal(ready(draft),true);
  assert.equal(sameFilters(draft,applied),false);
  assert.equal(sameFilters(snapshot(draft),draft),true);
});

test('9 recorded combinations use one denominator and stable rank on ties', () => {
  const rows = chestOrder.flatMap(chest => hindOrder.map(hindquarter => ({
    chest, hindquarter, observations: 0, total: 12, percentage: 0
  })));
  rows.find(row => row.chest === '厚' && row.hindquarter === '重厚').observations = 5;
  rows.find(row => row.chest === 'シャープ' && row.hindquarter === 'シャープ').observations = 3;
  rows.find(row => row.chest === '厚' && row.hindquarter === '厚').observations = 3;
  rows.find(row => row.chest === '重厚' && row.hindquarter === 'シャープ').observations = 1;
  const result = summarize(rows);
  assert.equal(rows.length, 9);
  assert.equal(result.n, 12);
  assert.deepEqual(result.top.map(x => [x.chest, x.hindquarter, x.count, x.percentage]), [
    ['厚', '重厚', 5, 41.7], ['シャープ', 'シャープ', 3, 25], ['厚', '厚', 3, 25]
  ]);
});

test('zero and sparse data never invent a combination', () => {
  assert.deepEqual(summarize([{chest:'厚', hindquarter:'重厚', observations:0, total:0}]).top, []);
  assert.equal(summarize([{chest:'厚', hindquarter:'重厚', observations:1, total:1}]).top.length, 1);
  assert.equal(Object.keys(colors).length, 3);
  for (const value of [...chestOrder, ...hindOrder]) assert.match(colors[value], /^#[0-9A-F]{6}$/);
});

test('detail distribution counts only filtered observations and preserves density and texture', () => {
  const rows = fromObservations([
    {chest:'厚',hindquarter:'重厚',hindquarter_density:'充足',hindquarter_texture:'標準'},
    {chest:'厚',hindquarter:'重厚',hindquarter_density:'未充足',hindquarter_texture:'弾力あり'},
    {chest:'シャープ',hindquarter:'厚',hindquarter_density:null,hindquarter_texture:null}
  ]);
  const result=summarize(rows);
  assert.equal(rows.length,9);
  assert.equal(result.n,3);
  assert.deepEqual(result.top.map(item=>[item.count,item.percentage]),[[2,66.7],[1,33.3]]);
  assert.deepEqual(rows.find(row=>row.chest==='厚'&&row.hindquarter==='重厚').texture_breakdown,
    {'標準':1,'張りあり':0,'弾力あり':1,'張りあり＋弾力あり':0});
  assert.equal(summarize(fromObservations([])).n,0);
});
