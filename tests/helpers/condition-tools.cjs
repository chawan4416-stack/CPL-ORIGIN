const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const src=fs.readFileSync(path.resolve(__dirname,'../../research.js'),'utf8').split('/* End embedded state summary module. */')[0];
const loaded=new Module(__filename,module);loaded._compile(src,__filename);module.exports=loaded.exports;
