import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let files;
try{files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean)}catch{files=[]}
function walk(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 if(['node_modules','.git','.cache','dist'].includes(e.name)||e.name==='local.properties'||e.name.endsWith('.ipk'))return[];
 return e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name];
})}
if(!files.length)files=walk(root);
const rejected=[];
const artwork=fs.readFileSync(path.join(root,'js/core/media/uj630Artwork.js'),'utf8');
if(!/export const UJ630_ARTWORK = \{\};/.test(artwork) || /https?:\/\//.test(artwork)) rejected.push('js/core/media/uj630Artwork.js: generated personal mapping');
for(const file of files){
 if(/(^|\/)(prive|private|evidence-uj630)(\/|$)|(^|\/)local\.properties$|\.(ipk|wgt|pem\.key)$/.test(file))rejected.push(file+': private/generated path');
 if(/^assets\/uj630-artwork(?:-1080|-720)?\//.test(file)&&!file.endsWith('/.gitkeep'))rejected.push(file+': personal artwork');
 const data=fs.readFileSync(path.join(root,file));if(data.includes(0))continue;
 const text=data.toString('utf8');
 if(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(text))rejected.push(file+': private key');
 if(/(?:ghp_|gho_)[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,}/.test(text))rejected.push(file+': GitHub token');
 if(/\/Users\/tommysuzanne\/|192\.168\.1\.(?:211|113)\b/.test(text))rejected.push(file+': workstation-specific address');
}
if(rejected.length){console.error(rejected.join('\n'));process.exitCode=1}else console.log('PASS public surface: '+files.length+' files; no private backup paths, configured workstation addresses, private keys, GitHub tokens or personal artwork. This complements, not replaces, the private known-value scan.');
