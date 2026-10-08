const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../suitability-summary.js');
test('texture transitions distinguish unevaluated from standard and allow both characteristics',()=>{
 for(const current of [null,'標準','張りあり','弾力あり','張りあり＋弾力あり']){
  assert.equal(S.toggleTexture(current,'標準'),current==='標準'?null:'標準');
 }
 assert.equal(S.toggleTexture(null,'張りあり'),'張りあり');
 assert.equal(S.toggleTexture('標準','弾力あり'),'弾力あり');
 assert.equal(S.toggleTexture('弾力あり','張りあり'),'張りあり＋弾力あり');
 assert.equal(S.toggleTexture('張りあり','弾力あり'),'張りあり＋弾力あり');
 assert.equal(S.toggleTexture('張りあり＋弾力あり','張りあり'),'弾力あり');
 assert.equal(S.toggleTexture('弾力あり','弾力あり'),null);
});
test('all four axes are required, obsolete values are rejected, NULL is never standard',()=>{
 const h={popularity:1,chest:'シャープ',hindquarter:'厚',hindquarter_density:'充足',hindquarter_texture:'標準'};
 assert.equal(S.complete(h),true);
 for(const key of ['chest','hindquarter','hindquarter_density','hindquarter_texture'])assert.equal(S.complete({...h,[key]:null}),false);
 assert.equal(S.complete({...h,chest:'厚−'}),false);
 assert.equal(S.complete({...h,hindquarter:'シャープ−'}),false);
 assert.equal(S.complete({...h,hindquarter_texture:'パンパン'}),false);
});
test('nine shape combinations and exclusive density/texture composition totals',()=>{
 const data=S.textureOrder.map((texture,i)=>({chest:'厚',hindquarter:i<3?'シャープ':'厚',hindquarter_density:i%2?'未充足':'充足',hindquarter_texture:texture}));
 const rows=S.fromObservations(data);assert.equal(rows.length,9);
 assert.equal(rows.reduce((n,r)=>n+r.observations,0),4);
 for(const value of S.textureOrder)assert.equal(rows.reduce((n,r)=>n+r.texture_breakdown[value],0),1);
 for(const value of S.densityOrder)assert.equal(rows.reduce((n,r)=>n+r.density_breakdown[value],0),2);
 const summary=S.summarize(rows);assert.equal(summary.n,4);assert.equal(summary.top[0].count,3);assert.equal(summary.top[0].percentage,75);
 assert.equal(S.fromObservations([]).length,9);assert.equal(S.summarize(S.fromObservations([])).n,0);
 assert.deepEqual(Object.keys(S.colors),['シャープ','厚','重厚']);
});
test('five filter completeness and snapshot matching remain unchanged',()=>{
 const f={racecourse:'東京',surface:'芝',distance:'1600',course:'通常',track_condition:'良'};
 assert.equal(S.ready(f),true);assert.equal(S.sameFilters(f,{...f,distance:1600}),true);
 for(const key of S.filterKeys)assert.equal(S.ready({...f,[key]:''}),false);
 assert.equal(S.sameFilters(f,{...f,track_condition:'重'}),false);
});
