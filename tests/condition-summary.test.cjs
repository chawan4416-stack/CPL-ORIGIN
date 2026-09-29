const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summarize,comparison}=require('../condition-summary.js');
const row=(condition_key,outcome_status,finish_position,observations=1)=>({condition_key,outcome_status,finish_position,observations});

test('official finishes, ties and status exclusions use finished n',()=>{
 const rows=[row('チャカつき','finished',1),row('チャカつき','finished',3,2),
   row('チャカつき','finished',4),row('チャカつき','finished',18),
   row('チャカつき','dnf',null,3),row('チャカつき','scratched',null,2)];
 const result=summarize(rows,'チャカつき');
 assert.deepEqual([result.n,result.placed,result.other,result.dnf,result.scratched],[5,3,2,3,2]);
 assert.equal(result.placedPercentage,60);
 assert.deepEqual(result.finishes.map(x=>[x.rank,x.count,x.percentage]),[[1,1,20],[3,2,40],[4,1,20],[18,1,20]]);
});

test('multiple observed conditions are independent; unselected is not a normal control',()=>{
 const rows=[row('イレ込み・強','finished',8),row('発汗・強','finished',8),row('発汗・強','finished',1)];
 assert.equal(summarize(rows,'イレ込み・強').n,1);
 assert.equal(summarize(rows,'発汗・強').n,2);
 assert.equal(summarize(rows,'チャカつき').n,0);
});

test('agitation and sweating intensity comparisons stay separate',()=>{
 const rows=[row('イレ込み・あり','finished',3,3),row('イレ込み・強','finished',4,2),
   row('発汗・あり','finished',2),row('発汗・強','finished',5,3)];
 assert.deepEqual(comparison(rows,'イレ込み・あり').map(x=>[x.n,x.placed]),[[3,3],[2,0]]);
 assert.deepEqual(comparison(rows,'発汗・強').map(x=>[x.n,x.placed]),[[1,1],[3,0]]);
 assert.equal(comparison(rows,'早歩き'),null);
});

test('zero and status-only results have no invented percentages or ranks',()=>{
 const absent=summarize([], '早歩き');
 const special=summarize([row('早歩き','dnf',null),row('早歩き','scratched',null)],'早歩き');
 for(const result of [absent,special]){
   assert.equal(result.n,0);assert.equal(result.placedPercentage,null);
   assert.equal(result.otherPercentage,null);assert.deepEqual(result.finishes,[]);
 }
 assert.deepEqual([special.dnf,special.scratched],[1,1]);
});

test('numeric data is validated before percentages',()=>{
 assert.throws(()=>summarize([row('早歩き','finished',0)],'早歩き'));
 assert.throws(()=>summarize([row('早歩き','finished',1,-1)],'早歩き'));
});
