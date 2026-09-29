(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CPLConditionSummary=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const choices=['チャカつき','ぎこちない歩様','イレ込み・あり','イレ込み・強',
    '発汗・あり','発汗・強','早歩き'];
  function summarize(rows,key){
    const selected=rows.filter(row=>row.condition_key===key);
    const distribution=new Map();
    let dnf=0,scratched=0;
    for(const row of selected){
      const count=Number(row.observations);
      if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid observation count');
      if(row.outcome_status==='dnf')dnf+=count;
      else if(row.outcome_status==='scratched')scratched+=count;
      else if(row.outcome_status==='finished'){
        const rank=Number(row.finish_position);
        if(!Number.isInteger(rank)||rank<1||rank>18)throw Error('Invalid official finish');
        distribution.set(rank,(distribution.get(rank)||0)+count);
      }
    }
    const finishes=[...distribution].sort((a,b)=>a[0]-b[0]).map(([rank,count])=>({
      rank,count,percentage:0
    }));
    const n=finishes.reduce((sum,row)=>sum+row.count,0);
    const placed=finishes.filter(row=>row.rank<=3).reduce((sum,row)=>sum+row.count,0);
    const other=n-placed;
    for(const row of finishes)row.percentage=n?Math.round(row.count/n*1000)/10:0;
    return {n,placed,other,dnf,scratched,finishes,
      placedPercentage:n?Math.round(placed/n*1000)/10:null,
      otherPercentage:n?Math.round(other/n*1000)/10:null};
  }
  function comparison(rows,key){
    const prefix=key?.startsWith('イレ込み・')?'イレ込み':key?.startsWith('発汗・')?'発汗':null;
    return prefix?['あり','強'].map(level=>({level,...summarize(rows,`${prefix}・${level}`)})):null;
  }
  return Object.freeze({choices,summarize,comparison});
});
