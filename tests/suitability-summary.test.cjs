const test = require('node:test');
const assert = require('node:assert/strict');
const {summarize, colors, chestOrder, hindOrder} = require('../suitability-summary.js');

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
