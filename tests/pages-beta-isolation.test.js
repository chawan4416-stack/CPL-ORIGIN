const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

test('Pages公開物はホワイトリスト17ファイルのみで、βは本番接続先を参照しない', t => {
  const root=path.resolve(__dirname,'..');
  const work=fs.mkdtempSync(path.join(os.tmpdir(),'cpl-pages-review-'));
  t.after(()=>fs.rmSync(work,{recursive:true,force:true}));
  const artifact=path.join(work,'site');
  execFileSync(process.execPath,[path.join(root,'ops/build-pages-artifact.mjs'),artifact]);
  const list=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const name=prefix?`${prefix}/${e.name}`:e.name;
    return e.isDirectory()?list(path.join(dir,e.name),name):[name];
  });
  const files=list(artifact);
  assert.equal(files.length,17);
  assert.ok(files.includes('supabase/config.js'));
  assert.ok(files.includes('supabase/beta-config.js'));
  for(const name of files)
    assert.doesNotMatch(name,/^(?:ops|tests|proposals|\.github|supabase\/migrations)\//);
  const prod=fs.readFileSync(path.join(artifact,'supabase/config.js'),'utf8');
  const prodURL=prod.match(/CPL_SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1];
  const prodKey=prod.match(/CPL_SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
  for(const name of ['all-runner.html','all-runner.js','all-runner-core.js','supabase/beta-config.js']){
    const contents=fs.readFileSync(path.join(artifact,name),'utf8');
    assert.ok(!contents.includes(prodURL),`${name} contains the production URL`);
    assert.ok(!contents.includes(prodKey),`${name} contains the production key`);
  }
  const html=fs.readFileSync(path.join(artifact,'all-runner.html'),'utf8');
  assert.match(html,/connect-src https:\/\/kczisspagwqzdvaeemir\.supabase\.co;/);
  assert.doesNotMatch(html,/src="supabase\/config\.js/);
  assert.match(html,/src="supabase\/beta-config\.js/);
});
