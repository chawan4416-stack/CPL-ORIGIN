/* Pure validation helpers; persistence and analysis always use the database. */
(function (root) {
  'use strict';
  const REQUIRED = ['chest','hindquarter','tone','gait','balance','flank_tuck'];
  const emptyRunner = horse_number => ({
    horse_number, entry_status:'eligible', chest:'', hindquarter:'', tone:'',
    gait:'', balance:'', flank_tuck:'', agitation:null, sweating:null,
    fast_walking:null, is_suitable:false, is_focus:false
  });
  const complete = runner => runner.entry_status === 'scratched' ||
    REQUIRED.every(key => Boolean(runner[key]));
  function evaluationError(runners) {
    if (!Array.isArray(runners) || runners.length === 0 || !runners.every(complete))
      return '取消馬を除く全頭の必須項目を入力してください。';
    if (runners.every(r => r.entry_status === 'scratched')) return '全馬取消は確定できません。';
    if (runners.some(r => r.entry_status === 'scratched' && (r.is_suitable || r.is_focus)))
      return '取消馬を適性馬や注目馬にできません。';
    if (runners.some(r => r.is_focus && !r.is_suitable) || runners.filter(r => r.is_focus).length > 1)
      return '注目馬は適性馬から最大1頭だけ選んでください。';
    return '';
  }
  function outcomeError(outcomes) {
    if (!Array.isArray(outcomes) || !outcomes.length) return '出走馬の結果を入力してください。';
    const starters = outcomes.filter(o => o.outcome_status !== 'scratched');
    if (!starters.length || !starters.some(o => o.outcome_status === 'placed' && Number(o.finish_position) === 1))
      return '公式1着馬を入力してください。';
    const popularity = starters.map(o => Number(o.popularity));
    if (popularity.some(n => !Number.isInteger(n) || n < 1 || n > starters.length) ||
      new Set(popularity).size !== starters.length) return '全出走馬の人気を重複なく入力してください。';
    if (outcomes.some(o => o.outcome_status === 'placed' && ![1,2,3].includes(Number(o.finish_position))))
      return '公式3着以内の着順を確認してください。';
    for (const rank of [2,3]) {
      if (outcomes.some(o => Number(o.finish_position) === rank) &&
        outcomes.filter(o => Number(o.finish_position) > 0 && Number(o.finish_position) < rank).length !== rank-1)
        return '同着による公式着順の欠番を確認してください。';
    }
    return '';
  }
  function summarize(runners, outcomes, resultStatus) {
    if (resultStatus !== 'official') return null;
    const byNumber = new Map(outcomes.map(o => [o.horse_number,o]));
    const totals = {suitable:{numerator:0,denominator:0},focus:{numerator:0,denominator:0},
      notSuitable:{numerator:0,denominator:0},topThree:0};
    for (const runner of runners) {
      const outcome=byNumber.get(runner.horse_number);
      if (!outcome || outcome.outcome_status === 'scratched') continue;
      const hit=Number(outcome.finish_position)>=1 && Number(outcome.finish_position)<=3;
      if (hit) totals.topThree++;
      for (const [key,chosen] of [['suitable',runner.is_suitable],
        ['focus',runner.is_focus],['notSuitable',!runner.is_suitable]]) {
        if (chosen) { totals[key].denominator++; if (hit) totals[key].numerator++; }
      }
    }
    return totals;
  }
  root.CPLAllRunnerCore = Object.freeze({ REQUIRED, emptyRunner, complete, evaluationError, outcomeError, summarize });
  if (typeof module !== 'undefined') module.exports.CPLAllRunnerCore = root.CPLAllRunnerCore;
})(typeof window === 'undefined' ? globalThis : window);
