// Build only the browser assets for GitHub Pages; never publish migrations or operations files.
import {copyFile, mkdir, readFile, readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] && resolve(process.argv[2]);
if (!output || output === root || output.startsWith(root + '/'))
  throw new Error('A new output directory outside the repository is required');
try { await readdir(output); throw new Error('Output directory must not exist'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const files = [
  'index.html', 'privacy.html', 'course-research.html', 'all-runner.html',
  'styles.css', 'all-runner.css', 'app.js', 'course-layout.js',
  'course-research.js', 'all-runner.js', 'all-runner-core.js',
  'supabase/config.js', 'supabase/beta-config.js',
  'assets/nakayama-course-3d-jra.jpg', 'assets/nakayama-dirt.png',
  'assets/nakayama-turf-inner.png', 'assets/nakayama-turf-outer.png'
];
const devRef = 'kczisspagwqzdvaeemir';
const prodConfig = await readFile(join(root, 'supabase/config.js'), 'utf8');
const prodURL = prodConfig.match(/CPL_SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
const prodKey = prodConfig.match(/CPL_SUPABASE_KEY\s*=\s*['"]([^'"]+)/)?.[1];
const betaConfig = await readFile(join(root, 'supabase/beta-config.js'), 'utf8');
const betaHTML = await readFile(join(root, 'all-runner.html'), 'utf8');
const betaJS = await readFile(join(root, 'all-runner.js'), 'utf8');
if (!prodURL || !prodKey || prodURL.includes(devRef))
  throw new Error('Production config is missing or cannot be distinguished from development');
if (!betaConfig.includes(`https://${devRef}.supabase.co`) ||
    !betaConfig.includes('sb_publishable_') ||
    !betaHTML.includes('supabase/beta-config.js') ||
    betaHTML.includes('supabase/config.js') ||
    !betaHTML.includes(`connect-src https://${devRef}.supabase.co;`) ||
    !betaJS.includes(`config.url === \`https://\${devRef}.supabase.co\``) ||
    !betaJS.includes('auth: { storageKey:'))
  throw new Error('Development-only configuration, guard or CSP is missing');
for (const content of [betaConfig, betaHTML, betaJS]) {
  if (content.includes(prodURL) || content.includes(prodKey))
    throw new Error('Production configuration found in beta assets');
  for (const match of content.matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/gi))
    if (match[1] !== devRef) throw new Error('Unexpected Supabase endpoint in beta assets');
}

for (const name of files) {
  const dest = join(output, name);
  await mkdir(dirname(dest), {recursive:true});
  await copyFile(join(root, name), dest);
}
const published = [];
async function visit(dir, prefix = '') {
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await visit(join(dir, entry.name), name);
    else published.push(name);
  }
}
await visit(output);
if (published.length !== files.length || published.some(name => !files.includes(name)))
  throw new Error('Pages artifact contains unexpected files');
console.log(`Pages artifact verified: ${files.length} allowlisted web files (CPL-DEV beta isolated)`);
