(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CPLConditionSummary=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const choices=['チャカつき','ぎこちない歩様','早歩き','イレ込み・あり','イレ込み・強','発汗・あり','発汗・強'];
  const popularityBands=[{label:'1～3人気',min:1,max:3},{label:'4～6人気',min:4,max:6},{label:'7人気以下',min:7,max:18}];
  const classOrder=['未勝利','1勝クラス','2勝クラス','3勝クラス','リステッド','オープン','G3','G2','G1'];
  const classNames=masters=>{
    const active=new Set(masters.filter(row=>row.category==='RACE_CLASS').map(row=>row.option_value));
    return classOrder.filter(name=>active.has(name));
  };
  const has=(row,key)=>({
    'チャカつき':()=>row.chaka===true,
    'ぎこちない歩様':()=>row.awkward_gait===true,
    '早歩き':()=>row.fast_walking===true,
    'イレ込み・あり':()=>row.agitation==='あり',
    'イレ込み・強':()=>row.agitation==='強',
    '発汗・あり':()=>row.sweating==='あり',
    '発汗・強':()=>row.sweating==='強'
  })[key]?.()===true;
  const finished=row=>row.outcome_status==='finished'&&Number.isInteger(Number(row.finish_position))&&Number(row.finish_position)>=1;
  const rate=(placed,n)=>n?Math.round(placed/n*1000)/10:null;
  function summarize(rows,keys){
    const selected=rows.filter(row=>keys.every(key=>has(row,key)));
    const complete=selected.filter(finished);
    const placed=complete.filter(row=>Number(row.finish_position)<=3).length;
    const n=complete.length;
    return {n,placed,other:n-placed,placedPercentage:rate(placed,n),otherPercentage:rate(n-placed,n),
      dnf:selected.filter(row=>row.outcome_status==='dnf').length,
      scratched:selected.filter(row=>row.outcome_status==='scratched').length};
  }
  function analyze(rows,key,classValues){
    const matching=rows.filter(row=>has(row,key));
    return {key,total:matching.length,overall:summarize(matching,[]),
      popularity:popularityBands.map(band=>({label:band.label,...summarize(matching.filter(row=>
        Number(row.popularity)>=band.min&&Number(row.popularity)<=band.max),[])})),
      classes:classValues.map(label=>({label,...summarize(matching.filter(row=>row.races?.race_class===label),[])}))};
  }
  function combinations(rows,key){
    const matching=rows.filter(row=>has(row,key));
    return choices.filter(other=>other!==key).flatMap(other=>{
      const observed=matching.filter(row=>has(row,other));
      return observed.length?[{key,otherState:other,observed:observed.length,...summarize(observed,[])}]:[];
    });
  }
  return Object.freeze({choices,popularityBands,classNames,has,summarize,analyze,combinations});
});
