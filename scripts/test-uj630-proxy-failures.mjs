import assert from'node:assert/strict';import fs from'node:fs';import os from'node:os';import path from'node:path';import{createRequire}from'node:module';import{EventEmitter}from'node:events';import{Writable,PassThrough}from'node:stream';
const require=createRequire(import.meta.url),{createImageProxyHandler}=require('../services/webos/src/imageProxy.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nuvio-proxy-failures-'));let aborted=0;
function request(handler,url='https://image.tmdb.org/t/p/w342/test.jpg'){
 const req={method:'GET',url:'/image-proxy?url='+encodeURIComponent(url)},res=new Writable({write(c,e,d){d()}});res.writeHead=code=>{res.status=code};
 return new Promise(resolve=>{res.on('finish',()=>resolve(res.status));handler(req,res)});
}
const transport=(type,body,headers={})=>(opts,callback)=>{const req=new EventEmitter();req.abort=()=>{aborted++};setTimeout(()=>{const res=new PassThrough();res.statusCode=200;res.headers={'content-type':type,...headers};callback(res);res.end(body)},0);return req;};
try{
 assert.equal(await request(createImageProxyHandler({cacheDir:path.join(dir,'missing','cache')})),503,'Unavailable storage fails without unbounded fallback');
 assert.equal(await request(createImageProxyHandler({cacheDir:dir,transportGet:transport('image/gif',Buffer.from('GIF89a'))})),502);
 assert.equal(await request(createImageProxyHandler({cacheDir:dir,transportGet:transport('image/jpeg',Buffer.from('invalid'))})),502);
 assert.equal(await request(createImageProxyHandler({cacheDir:dir,transportGet:transport('image/jpeg',Buffer.from('x'),{'content-length':1048577})})),502,'Oversized content length rejected');
 const cap=createImageProxyHandler({cacheDir:dir,maxCacheBytes:4096});assert.equal(await request(cap),502,'Insufficient capacity fails promptly');assert.equal(cap.getStats().active,0);
 const block=createImageProxyHandler({cacheDir:dir});assert.equal(await request(block,'https://unexpected.invalid/x.jpg'),403);assert.equal(await request(block,'https://user:password@image.tmdb.org/x.jpg'),403);
 const orphan=path.join(dir,'a'.repeat(64)+'.part');fs.writeFileSync(orphan,Buffer.alloc(128));const original=fs.unlinkSync;
 try{fs.unlinkSync=file=>{if(file===orphan){const e=Error('unavailable');e.code='EACCES';throw e}return original(file)};
 assert.equal(await request(createImageProxyHandler({cacheDir:dir})),503,'Undeletable temporary bytes cannot be ignored by quota accounting');
 }finally{fs.unlinkSync=original}
 assert(aborted>=2);console.log('PASS: unavailable storage, invalid/animated/oversized images, full cache, host validation and undeletable temporary files fail closed.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
