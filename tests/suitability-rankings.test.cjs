const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../suitability-summary.js');
const observation=(finish,density='充足',texture='標準')=>({finish_position:finish,hindquarter_density:density,hindquarter_texture:texture});
test('each cumulative cohort counts actual finishers including ties, not races',()=>{
 const data=[observation(1),observation(1,'未充足','張りあり'),observation(2),observation(3,'未充足','弾力あり'),observation(4),observation(null)];
 assert.deepEqual([1,2,3].map(finish=>S.rankObservations(data,finish).n),[2,3,4]);
 assert.equal(S.rankObservations(data,1).density[0].percentage,50);
 assert.equal(S.rankObservations(data,2).density[0].percentage,66.7);
 assert.equal(S.rankObservations(data,3).density[0].percentage,50);
});
test('equal counts share competition rank and predefined axis order, including zero categories',()=>{
 const data=[observation(1,'充足','張りあり'),observation(1,'未充足','標準'),observation(1,'充足','標準'),observation(1,'未充足','張りあり')];
 const result=S.rankObservations(data,1);
 assert.deepEqual(result.texture.map(row=>row.rank),[1,1,3,3]);
 assert.deepEqual(result.texture.map(row=>row.label),S.textureOrder);
 assert.deepEqual(result.texture.map(row=>row.count),[2,2,0,0]);
 assert.deepEqual(result.density.map(row=>row.rank),[1,1]);
 assert.deepEqual(S.rankObservations(data.reverse(),1),result);
});
test('empty cohorts keep all six zero categories but no artificial percentages or ranks',()=>{
 for(const result of [S.rankObservations([],3),S.rankObservations([observation(3)],1)]){
  assert.equal(result.n,0);assert.equal(result.density.length,2);assert.equal(result.texture.length,4);
  assert.ok([...result.density,...result.texture].every(row=>row.count===0&&row.rank===null&&row.percentage===null));
 }
});
test('combined texture is exclusive and never counted in either individual characteristic',()=>{
 const result=S.rankObservations([observation(1,'充足','張りあり＋弾力あり'),observation(2,'充足','張りあり＋弾力あり'),observation(3,'未充足','標準')],3);
 assert.equal(result.texture.find(row=>row.label==='張りあり＋弾力あり').count,2);
 assert.equal(result.texture.find(row=>row.label==='張りあり').count,0);
 assert.equal(result.texture.find(row=>row.label==='弾力あり').count,0);
 assert.equal(result.texture.reduce((sum,row)=>sum+row.count,0),3);
 assert.equal(result.density.reduce((sum,row)=>sum+row.count,0),3);
});
test('shape values do not affect density/texture ranks; NULL is not inferred and input is unchanged',()=>{
 const data=[{...observation(1),chest:'厚',hindquarter:'厚'},observation(1,null,null)];
 const original=JSON.stringify(data),result=S.rankObservations(data,1);
 assert.equal(result.n,2);assert.equal(result.texture.find(row=>row.label==='標準').count,1);
 assert.equal(result.texture.find(row=>row.label==='標準').percentage,50);
 assert.deepEqual(S.rankObservations(data.map(row=>({...row,chest:'重厚',hindquarter:'シャープ'})),1),result);
 assert.equal(JSON.stringify(data),original);
});
