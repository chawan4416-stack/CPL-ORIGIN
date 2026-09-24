const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../all-runner-core.js').CPLAllRunnerCore;

const runner = number => ({...core.emptyRunner(number),chest:'厚',hindquarter:'シャープ',
  tone:'パンパン',gait:'普通',balance:'均整',flank_tuck:'なし'});
const outcomes = ranks => ranks.map((rank,i) => ({horse_number:i+1,
  outcome_status:rank ? 'placed':'finished_other',popularity:i+1,finish_position:rank}));

test('全頭の必須入力と任意項目',() => {
  const rows=[runner(1),runner(2)];
  assert.equal(core.evaluationError(rows),'');
  rows[1].flank_tuck='';
  assert.match(core.evaluationError(rows),/必須項目/);
  rows[1]=core.emptyRunner(2);
  rows[1].entry_status='scratched';
  assert.equal(core.evaluationError(rows),'');
  rows[0].entry_status='scratched';
  assert.match(core.evaluationError(rows),/全馬取消/);
});

test('適性馬から注目馬は1頭まで',() => {
  const rows=[runner(1),runner(2)];
  rows[0].is_focus=true;
  assert.match(core.evaluationError(rows),/注目馬/);
  rows[0].is_suitable=true;
  assert.equal(core.evaluationError(rows),'');
  rows[1].is_focus=true; rows[1].is_suitable=true;
  assert.match(core.evaluationError(rows),/注目馬/);
});

test('通常、1着同着、2着同着、3着同着を受理',() => {
  for (const ranks of [[1,2,3,null],[1,1,3,null],[1,2,2,null],[1,2,3,3]])
    assert.equal(core.outcomeError(outcomes(ranks)),'');
  assert.equal(outcomes([1,2,3,3]).filter(o => o.finish_position && o.finish_position<=3).length,4);
});

test('公式順位の不正な詰め替えを拒否',() => {
  assert.match(core.outcomeError(outcomes([1,1,2,null])),/同着/);
  assert.match(core.outcomeError(outcomes([2,2,3,null])),/公式1着/);
});

test('取消は人気不要、競走中止は人気必須',() => {
  const rows=outcomes([1,2,3,null]);
  rows[3]={horse_number:4,outcome_status:'scratched',popularity:null,finish_position:null};
  assert.equal(core.outcomeError(rows),'');
  rows[3]={horse_number:4,outcome_status:'dnf',popularity:null,finish_position:null};
  assert.match(core.outcomeError(rows),/人気/);
});

test('公式3着同着の全馬を数え、取消とvoidを集計から除く',() => {
  const runners=[1,2,3,4,5].map(runner);
  runners[0].is_suitable=true; runners[0].is_focus=true;
  runners[4].is_suitable=true;
  const rows=outcomes([1,2,3,3,null]);
  rows[4]={horse_number:5,outcome_status:'scratched',popularity:null,finish_position:null};
  const stats=core.summarize(runners,rows,'official');
  assert.equal(stats.topThree,4);
  assert.deepEqual(stats.suitable,{numerator:1,denominator:1});
  assert.deepEqual(stats.notSuitable,{numerator:3,denominator:3});
  assert.equal(core.summarize(runners,rows,'void'),null);
});
