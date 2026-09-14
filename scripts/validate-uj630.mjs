import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';import {UJ630_BUDGETS} from '../js/platform/uj630Budgets.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.resolve(process.env.NUVIO_EVIDENCE_DIR||path.join(root,'../evidence/validation-'+Date.now()));
if(evidence===root||evidence.startsWith(root+path.sep))throw Error('Validation evidence must be outside source');
fs.mkdirSync(evidence,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function files(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const relative=prefix+e.name;if(['node_modules','.git','.cache','dist'].includes(e.name)||/\.ipk$|local\.properties|\.env/.test(e.name))return[];
 return e.isDirectory()?files(path.join(dir,e.name),relative+'/'):[relative];}).sort()}
const hashes=Object.fromEntries(files(root).map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));
const manifest={createdAt:new Date().toISOString(),label:process.env.NUVIO_BUILD_LABEL||null,sourceSha256:hash(JSON.stringify(hashes)),lockfileSha256:hash(fs.readFileSync(path.join(root,'package-lock.json'))),node:process.version,platform:process.platform,arch:process.arch,resolution:'1920x1080',budgets:UJ630_BUDGETS,files:hashes,checks:[],qualification:'LOCAL_ONLY_TV_VALIDATION_REQUIRED'};
const save=()=>fs.writeFileSync(path.join(evidence,'manifest.json'),JSON.stringify(manifest,null,2));save();
function run(name,args){const log=fs.openSync(path.join(evidence,name+'.log'),'w');const start=Date.now();let result;
 try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,NUVIO_EVIDENCE_DIR:evidence,NUVIO_UI_RESOLUTION:'1920x1080'},stdio:['ignore',log,log],timeout:600000})}finally{fs.closeSync(log)}
 manifest.checks.push({name,passed:result.status===0,elapsedMs:Date.now()-start,exitCode:result.status});save();console.log(`${result.status===0?'PASS':'FAIL'} ${name}`);return result.status===0;}
let passed=true;
passed=run('uj630',['scripts/test-uj630-all.mjs'])&&passed;
passed=run('native',['--test',...files(path.join(root,'js')).filter(p=>p.endsWith('.test.mjs')).map(p=>'js/'+p)])&&passed;
for(const script of ['checkNoUndef','checkSourceIntegrity','checkLegacyRegex'])passed=run(script,['scripts/'+script+'.mjs'])&&passed;
if(!passed)process.exitCode=1;
else if(!process.argv[2])throw Error('Pass the exact reference IPK to construct and verify the candidate');
else{
 passed=run('build',['scripts/build-uj630.mjs',path.resolve(process.argv[2])])&&passed;
 if(passed){
  for(const script of ['checkLegacyCss','checkLegacyCssVars','checkLegacyCssSupport','checkLegacyJsApis'])passed=run(script,['scripts/'+script+'.mjs'])&&passed;
  passed=run('packaged-libraries',['scripts/checkUj630PackagedLibraries.mjs'])&&passed;
  const packagedApp=path.join(root,'.cache/webos-package/app');
  const bundleFiles=files(packagedApp).filter(p=>/^(app\.bundle|[^/]+\.chunk|core-js\.bundle|boot-guard)\.js$/.test(p));
  if(bundleFiles.length<9)throw Error('Missing legacy entry/chunk files');
  try{for(const file of bundleFiles)parse(fs.readFileSync(path.join(packagedApp,file),'utf8'),{ecmaVersion:5});manifest.checks.push({name:'legacy-syntax-all-chunks',passed:true,files:bundleFiles});}catch(error){passed=false;manifest.checks.push({name:'legacy-syntax-all-chunks',passed:false,reason:error.message});}
  const ipk=path.join(root,'space.nuvio.webos_1.1.2_all.ipk');
  if(fs.existsSync(ipk)){manifest.package={sha256:hash(fs.readFileSync(ipk)),bytes:fs.statSync(ipk).size};fs.copyFileSync(ipk,path.join(evidence,'candidate-1080p.ipk'));}
  else passed=false;
 }
 const postbuild=Object.fromEntries(files(root).map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));
 manifest.postbuildSourceSha256=hash(JSON.stringify(postbuild));
 fs.writeFileSync(path.join(evidence,'postbuild-sources.json'),JSON.stringify({sha256:manifest.postbuildSourceSha256,files:postbuild},null,2));
 manifest.localChecksPassed=passed;save();if(!passed)process.exitCode=1;
}
