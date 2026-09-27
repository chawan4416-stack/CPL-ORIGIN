// Build a browser-ready CPL-DEV artifact without a production Supabase endpoint.
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=process.argv[2]&&resolve(process.argv[2]);
if(!target||target===root||target.startsWith(root+'/'))throw Error('Use an unused directory outside repository');
const beta=await readFile(join(root,'supabase/beta-config.js'),'utf8');
const prod=await readFile(join(root,'supabase/config.js'),'utf8');
const url=beta.match(/url:\s*['"]([^'"]+)/)?.[1];
const key=beta.match(/publishableKey:\s*['"]([^'"]+)/)?.[1];
const prodURL=prod.match(/CPL_SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
const prodKey=prod.match(/CPL_SUPABASE_KEY\s*=\s*['"]([^'"]+)/)?.[1];
if(url!=='https://kczisspagwqzdvaeemir.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||''))
  throw Error('CPL-DEV settings missing');
const build=spawnSync(process.execPath,[join(root,'ops/build-pages-artifact.mjs'),target],{encoding:'utf8'});
if(build.status!==0)throw Error(build.stderr||build.stdout);
await writeFile(join(target,'supabase/config.js'),
  `window.CPL_SUPABASE_URL = ${JSON.stringify(url)};\nwindow.CPL_SUPABASE_KEY = ${JSON.stringify(key)};\n`);
async function visit(path){for(const e of await readdir(path,{withFileTypes:true})){
  const name=join(path,e.name);if(e.isDirectory())await visit(name);
  else if(/\.(js|html|css)$/.test(name)){const content=await readFile(name,'utf8');
    if((prodURL&&content.includes(prodURL))||(prodKey&&content.includes(prodKey)))throw Error('Production endpoint in preview');
  }
}}
await visit(target);
console.log('CPL-DEV research artifact verified');
