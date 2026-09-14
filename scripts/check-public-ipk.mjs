import fs from'node:fs';import path from'node:path';import os from'node:os';import crypto from'node:crypto';import{execFileSync}from'node:child_process';import{parse}from'acorn';
const ipk=process.argv[2],out=process.argv[3];if(!ipk||!out)throw Error('ipk and report paths required');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'uj630-package-read-'));let rows=[];
try{const data=execFileSync('ar',['-p',path.resolve(ipk),'data.tar.gz'],{maxBuffer:64*1024*1024});execFileSync('tar',['-xz','-C',tmp],{input:data});
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else if(/\.(?:js|cjs)$/.test(entry.name)){const rel=path.relative(tmp,p),b=fs.readFileSync(p),row={file:rel,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};
 const excluded=rel.includes('.plugin.service/')||/quickjs-emscripten.global.js$|plugin-worker.js$/.test(rel);
 if(excluded)row.excluded='Executable-plugin policy rejects UJ630 before loading; actual policy tests in packaged-libraries evidence.';
 else{parse(b.toString('utf8'),{ecmaVersion:5});row.es5=true;}rows.push(row);}}}scan(tmp);
 fs.writeFileSync(out,JSON.stringify({ipkSha256:crypto.createHash('sha256').update(fs.readFileSync(ipk)).digest('hex'),scope:'Actual final IPK contents after all packager/minifier passes; syntax only, not exhaustive runtime API proof.',files:rows},null,2));console.log({files:rows.length,executableES5:rows.filter(r=>r.es5).length,guardedFiles:rows.filter(r=>r.excluded).length});
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
