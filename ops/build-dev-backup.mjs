// Prepare a separate Apps Script for CPL-DEV. Does not edit the production v5 job.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target = process.argv[2] && resolve(process.argv[2]);
if (!target || target === join(root,'ops/CPLBackupV6.gs') || target.startsWith(root+'/'))
  throw new Error('Choose an output file outside the repository');
const source = await readFile(join(root,'ops/CPLBackupV6.gs'),'utf8');
const original="const CPL_V6_FOLDER = 'CPL_BACKUP';";
const insertionPoint="  if (!url || !secret) throw new Error('開発環境のURLとsecret keyをScript Propertiesに設定してください。');";
const injection="  if (projectRefV6_(url) !== 'kczisspagwqzdvaeemir') throw new Error('CPL-DEV以外への接続は禁止です。');";
if (source.split(original).length!==2 || source.split(insertionPoint).length!==2)
  throw new Error('The backup script has changed; review the development guard');
const script = source.replace(original,"const CPL_V6_FOLDER = 'CPL_BACKUP_DEV';")
  .replace(insertionPoint,insertionPoint+"\n"+injection);
await writeFile(target,script,{flag:'wx'});
console.log(`CPL-DEV-only Apps Script prepared: ${target}`);
