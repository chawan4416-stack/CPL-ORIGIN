const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summarize,analyze,has,choices,classNames}=require('./helpers/condition-tools.cjs');
const row=(finish_position,popularity,race_class,flags={})=>({
  id:crypto.randomUUID(),outcome_status:'finished',finish_position,popularity,
  races:{race_class},chaka:false,awkward_gait:false,fast_walking:false,agitation:null,sweating:null,...flags
});
const crypto=require('node:crypto');

test('one chosen state uses official 1–3 versus 4+ and excludes special statuses',()=>{
 const records=[row(1,1,'未勝利',{sweating:'強'}),row(3,4,'未勝利',{sweating:'強'}),row(4,7,'G3',{sweating:'強'}),row(18,8,'G3',{sweating:'強'}),
   {...row(null,2,'未勝利',{sweating:'強'}),outcome_status:'dnf'},
   {...row(null,null,'G3',{sweating:'強'}),outcome_status:'scratched'},
   row(1,1,'G3',{sweating:'あり'})];
 const result=analyze(records,'発汗・強',['未勝利','G3']);
 assert.deepEqual([result.total,result.overall.n,result.overall.placed,result.overall.other,result.overall.dnf,result.overall.scratched],[6,4,2,2,1,1]);
 assert.equal(result.overall.placedPercentage,50);
 assert.equal(result.popularity[0].n,1);
 assert.equal(result.popularity[1].n,1);
 assert.equal(result.popularity[2].n,2);
 assert.deepEqual(result.classes.map(x=>[x.label,x.n,x.placed]),[['未勝利',2,2],['G3',2,0]]);
});

test('popularity bands use their own finished denominator and include 7–18',()=>{
 const records=[row(1,1,'1勝クラス',{chaka:true}),row(4,3,'1勝クラス',{chaka:true}),row(2,4,'1勝クラス',{chaka:true}),
   row(5,6,'1勝クラス',{chaka:true}),row(3,7,'1勝クラス',{chaka:true}),row(18,18,'1勝クラス',{chaka:true})];
 const result=analyze(records,'チャカつき',['1勝クラス']);
 assert.deepEqual(result.popularity.map(x=>[x.n,x.placed,x.placedPercentage]),[[2,1,50],[2,1,50],[2,1,50]]);
});

test('AND matches the same observation once; different records do not combine',()=>{
 const both=row(2,5,'オープン',{sweating:'強',agitation:'強'});
 const records=[both,row(4,7,'オープン',{sweating:'強'}),row(1,2,'オープン',{agitation:'強'}),both];
 // Database rows have unique IDs; the query returns each record once.
 const unique=[...new Map(records.map(x=>[x.id,x])).values()];
 const result=summarize(unique,['発汗・強','イレ込み・強']);
 assert.deepEqual([result.n,result.placed,result.other],[1,1,0]);
 assert.equal(summarize(unique,['発汗・強']).n,2);
 assert.equal(summarize(unique,['イレ込み・強']).n,2);
});

test('selected state switches all breakdowns and zero never becomes 0 percent',()=>{
 const records=[row(1,1,'G1',{sweating:'強'}),row(6,9,'未勝利',{agitation:'あり'})];
 const sweat=analyze(records,'発汗・強',['未勝利','G1']);
 const agitation=analyze(records,'イレ込み・あり',['未勝利','G1']);
 assert.deepEqual([sweat.overall.placed,sweat.popularity[0].placed,sweat.classes[1].placed],[1,1,1]);
 assert.deepEqual([agitation.overall.placed,agitation.popularity[2].other,agitation.classes[0].other],[0,1,1]);
 assert.equal(sweat.classes[0].placedPercentage,null);
 assert.equal(analyze([], '早歩き', ['G1']).overall.placedPercentage,null);
 assert.equal(summarize(records,['発汗・強','イレ込み・強']).n,0);
 assert.equal(summarize(records,['発汗・強','イレ込み・強']).otherPercentage,null);
});

test('all seven labels match persisted condition fields',()=>{
 assert.equal(choices.length,7);
 assert.equal(has({fast_walking:true},'早歩き'),true);
 assert.equal(has({awkward_gait:true},'ぎこちない歩様'),true);
 assert.equal(has({sweating:'あり'},'発汗・強'),false);
});

test('the chosen state and AND combination span every race condition',()=>{
 const records=[
   {...row(1,1,'未勝利',{sweating:'強',agitation:'強'}),races:{racecourse:'東京',surface:'芝',race_class:'未勝利'}},
   {...row(4,7,'G3',{sweating:'強',agitation:'強'}),races:{racecourse:'札幌',surface:'ダート',race_class:'G3'}},
   {...row(3,5,'G1',{sweating:'強'}),races:{racecourse:'京都',surface:'芝',race_class:'G1'}}
 ];
 const selected=analyze(records,'発汗・強',['未勝利','G3','G1']);
 assert.deepEqual([selected.overall.n,selected.overall.placed,selected.overall.other],[3,2,1]);
 assert.deepEqual(selected.classes.map(x=>x.n),[1,1,1]);
 assert.deepEqual([summarize(records,['発汗・強','イレ込み・強']).n,
   summarize(records,['発汗・強','イレ込み・強']).placed],[2,1]);
});

test('class labels come from existing masters; maiden remains and newcomer is excluded',()=>{
 const names=['新馬','未勝利','1勝クラス','2勝クラス','3勝クラス','リステッド','オープン','G3','G2','G1'];
 const masters=['東京','札幌'].flatMap(field_key=>names.map(option_value=>({category:'RACE_CLASS',field_key,option_value})));
 assert.deepEqual(classNames(masters),names.slice(1));
 assert.equal(classNames(masters).includes('新馬'),false);
});
