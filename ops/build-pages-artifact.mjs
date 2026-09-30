// Publish only the completed CPL Web research UI. DEV and retired pages stay off the formal Site.
import {copyFile, mkdir, readFile, readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2]&&resolve(process.argv[2]);
if(!output||output===root||output.startsWith(root+'/'))throw Error('An unused output directory outside the repository is required');
try{await readdir(output);throw Error('Output directory must not exist');}
catch(error){if(error.code!=='ENOENT')throw error;}
const files=['index.html','research.html','research.css','research.js','suitability-summary.js','assets/horse-ink-diagram.webp','auth-return.js','supabase/config.js','privacy.html','assets/nakayama-turf-inner.png','assets/nakayama-turf-outer.png','assets/nakayama-dirt.png','assets/nakayama-course-3d-jra.jpg'];
const prodRef='ekgislctkribtztazvsd',devRef='kczisspagwqzdvaeemir';
const config=await readFile(join(root,'supabase/config.js'),'utf8');
const page=await readFile(join(root,'research.html'),'utf8');
const script=await readFile(join(root,'research.js'),'utf8');
if(!config.includes(`https://${prodRef}.supabase.co`)||!config.includes('sb_publishable_')||
 !page.includes('supabase/config.js')||!page.includes(`connect-src https://${prodRef}.supabase.co;`)||
 !script.includes(`const ref='${prodRef}'`)||!script.includes('config?.projectRef===ref'))
 throw Error('Formal Supabase routing or guard is missing');
for(const name of files){
 const content=await readFile(join(root,name));
 if(content.toString('utf8').includes(devRef)||/CPL-DEV|CPL_BETA_CONFIG/.test(content.toString('utf8')))throw Error(`DEV reference in ${name}`);
 const dest=join(output,name);await mkdir(dirname(dest),{recursive:true});await copyFile(join(root,name),dest);
}
const published=[];
async function visit(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){
 const name=prefix?`${prefix}/${entry.name}`:entry.name;
 if(entry.isDirectory())await visit(join(dir,entry.name),name);else published.push(name);
}}
await visit(output);
if(published.length!==files.length||published.some(name=>!files.includes(name)))throw Error('Unexpected formal artifact');
console.log(`CPL Web Ver1.0 artifact verified: ${files.length} allowlisted files`);
