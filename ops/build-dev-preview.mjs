// Build a static CPL-DEV-only preview outside the production GitHub Pages tree.
// Usage: CPL_DEV_PUBLISHABLE_KEY=sb_publishable_... node ops/build-dev-preview.mjs /absolute/output/path
import { readFile, writeFile, copyFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] && resolve(process.argv[2]);
const ref = 'kczisspagwqzdvaeemir';
const url = `https://${ref}.supabase.co`;
const key = process.env.CPL_DEV_PUBLISHABLE_KEY;
if (!output || output === root || output.startsWith(root + '/'))
  throw new Error('Provide a new output directory outside the CPL-ORIGIN repository');
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key || ''))
  throw new Error('An enabled CPL-DEV publishable key is required');
try { await readdir(output); throw new Error('Output directory must not exist'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

// Copy only browser files. Never copy production supabase/config.js or operations files.
const files = [
  'index.html', 'all-runner.html', 'course-research.html', 'privacy.html',
  'app.js', 'course-layout.js', 'all-runner.js', 'all-runner-core.js',
  'course-research.js', 'styles.css', 'all-runner.css',
  'assets/nakayama-course-3d-jra.jpg', 'assets/nakayama-dirt.png',
  'assets/nakayama-turf-inner.png', 'assets/nakayama-turf-outer.png'
];
const productionConfig = await readFile(join(root,'supabase/config.js'),'utf8');
const productionUrl = productionConfig.match(/CPL_SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
const productionKey = productionConfig.match(/CPL_SUPABASE_KEY\s*=\s*['"]([^'"]+)/)?.[1];
if (!productionUrl || !productionKey || productionUrl === url || productionKey === key)
  throw new Error('Cannot distinguish development from production configuration');
await mkdir(output, {recursive:true});
for (const file of files) {
  await mkdir(dirname(join(output,file)), {recursive:true});
  await copyFile(join(root,file),join(output,file));
}
await mkdir(join(output,'supabase'),{recursive:true});
await writeFile(join(output,'supabase/config.js'),
  `window.CPL_SUPABASE_URL = ${JSON.stringify(url)};\nwindow.CPL_SUPABASE_KEY = ${JSON.stringify(key)};\n`);
await writeFile(join(output,'_headers'),
  `/*\n  Content-Security-Policy: connect-src ${url}; base-uri 'self'; object-src 'none'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n`);

for (const file of [...files,'supabase/config.js','_headers']) {
  const data = await readFile(join(output,file));
  if (data.includes(productionUrl) || data.includes(productionKey))
    throw new Error(`Production configuration detected in ${file}`);
  for (const match of data.toString('utf8').matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/gi))
    if (match[1] !== ref) throw new Error(`Foreign Supabase project detected in ${file}`);
}
console.log(`CPL-DEV preview verified: ${files.length + 2} files; project ${ref}; output ${output}`);
