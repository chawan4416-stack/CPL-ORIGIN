const test = require('node:test');
const assert = require('node:assert/strict');
const {summarize, fromObservations, colors, chestOrder, hindOrder} = require('../suitability-summary.js');

test('24 recorded combinations use one denominator and stable rank on ties', () => {
  const rows = chestOrder.flatMap(chest => hindOrder.map(hindquarter => ({
    chest, hindquarter, observations: 0, total: 12, percentage: 0
  })));
  rows.find(row => row.chest === '厚' && row.hindquarter === '重厚−').observations = 5;
  rows.find(row => row.chest === '厚−' && row.hindquarter === 'シャープ').observations = 3;
  rows.find(row => row.chest === '厚' && row.hindquarter === '厚').observations = 3;
  rows.find(row => row.chest === 'シャープ' && row.hindquarter === '厚−').observations = 1;
  const result = summarize(rows);
  assert.equal(rows.length, 24);
  assert.equal(result.n, 12);
  assert.deepEqual(result.top.map(x => [x.chest, x.hindquarter, x.count, x.percentage]), [
    ['厚', '重厚−', 5, 41.7], ['厚−', 'シャープ', 3, 25], ['厚', '厚', 3, 25]
  ]);
});

test('zero and sparse data never invent a combination', () => {
  assert.deepEqual(summarize([{chest:'厚', hindquarter:'重厚', observations:0, total:0}]).top, []);
  assert.equal(summarize([{chest:'厚', hindquarter:'重厚', observations:1, total:1}]).top.length, 1);
  assert.equal(Object.keys(colors).length, 6);
  for (const value of [...chestOrder, ...hindOrder]) assert.match(colors[value], /^#[0-9A-F]{6}$/);
});

test('detail distribution counts only filtered observations and preserves tone', () => {
  const rows = fromObservations([
    {chest:'厚',hindquarter:'重厚−',tone:'パンパン'},
    {chest:'厚',hindquarter:'重厚−',tone:'普通'},
    {chest:'シャープ',hindquarter:'厚',tone:null}
  ]);
  const result=summarize(rows);
  assert.equal(rows.length,24);
  assert.equal(result.n,3);
  assert.deepEqual(result.top.map(item=>[item.count,item.percentage]),[[2,66.7],[1,33.3]]);
  assert.deepEqual(rows.find(row=>row.chest==='厚'&&row.hindquarter==='重厚−').tone_breakdown,
    {'パンパン':1,'普通':1,'ゴム感':0,'未観察':0});
  assert.equal(summarize(fromObservations([])).n,0);
});
