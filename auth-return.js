// The existing production OAuth redirect lands on HOME; exchange it using the research session key.
(() => {
  'use strict';
  const ref='ekgislctkribtztazvsd';
  if(!window.supabase||window.CPL_SUPABASE_URL!==`https://${ref}.supabase.co`||
     !/^sb_publishable_[A-Za-z0-9_-]+$/.test(window.CPL_SUPABASE_KEY||''))return;
  if(!location.search.includes('code=')&&!location.hash.includes('access_token='))return;
  const db=window.supabase.createClient(window.CPL_SUPABASE_URL,window.CPL_SUPABASE_KEY,
    {auth:{storageKey:`cpl-web-${ref}-research-v1-auth`}});
  db.auth.getSession().then(({data,error})=>{
    if(data.session)location.replace(new URL('research.html',location.href).href);
    else if(error)document.querySelector('.home-panel p').textContent='ログインを完了できませんでした。もう一度お試しください。';
  });
})();
