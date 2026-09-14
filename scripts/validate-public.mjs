import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parse} from 'acorn';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.NUVIO_EVIDENCE_DIR||path.join(root,'../nuvio-public-validation'));
if(output===root||output.startsWith(root+path.sep))throw Error('Evidence must stay outside the source directory');
fs.mkdirSync(output,{recursive:true});
const steps=[];
function run(name,args){
 const fd=fs.openSync(path.join(output,name+'.log'),'w');const start=Date.now();let result;
 try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,NUVIO_EVIDENCE_DIR:output},stdio:['ignore',fd,fd],timeout:600000})}finally{fs.closeSync(fd)}
 steps.push({name,passed:result.status===0,elapsedMs:Date.now()-start});
 fs.writeFileSync(path.join(output,'public-validation.json'),JSON.stringify({scope:'Local automated checks; placeholder package, no new TV qualification.',steps},null,2));
 console.log(`${result.status===0?'PASS':'FAIL'} ${name}`);
 if(result.status!==0)throw Error('Validation failed: '+name+' (see log outside sources)');
}
function tests(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tests(path.join(dir,e.name)):e.name.endsWith('.test.mjs')?[path.join(dir,e.name)]:[])}
run('public-surface',['scripts/check-public-release.mjs']);
run('uj630',['scripts/test-uj630-all.mjs']);
run('native',['--test',...tests(path.join(root,'js'))]);
for(const name of ['checkSourceIntegrity','checkNoUndef'])run(name,['scripts/'+name+'.mjs']);
run('build',['scripts/build-uj630-public.mjs','--check-only']);
for(const name of ['checkLegacyRegex','checkLegacyCss','checkLegacyCssVars','checkLegacyCssSupport','checkLegacyJsApis','checkUj630PackagedLibraries'])run(name,['scripts/'+name+'.mjs']);
const app=path.join(root,'.cache/webos-package/app');
const files=fs.readdirSync(app).filter(f=>/^(app\.bundle|[^/]+\.chunk|core-js\.bundle|boot-guard)\.js$/.test(f));
if(files.length<9)throw Error('Missing legacy chunks');
for(const file of files)parse(fs.readFileSync(path.join(app,file),'utf8'),{ecmaVersion:5});
fs.writeFileSync(path.join(output,'legacy-syntax.json'),JSON.stringify({passed:true,files},null,2));
console.log('PASS ES5 syntax for '+files.length+' entry/chunk files');

run('actual-ipk',['scripts/check-public-ipk.mjs','space.nuvio.webos_1.1.2_all.ipk',path.join(output,'actual-ipk-syntax.json')]);
