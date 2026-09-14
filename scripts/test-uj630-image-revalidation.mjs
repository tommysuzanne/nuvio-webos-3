import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {EventEmitter} from 'node:events';import {Writable,PassThrough} from 'node:stream';
const require=createRequire(import.meta.url),{createImageProxyHandler}=require('../services/webos/src/imageProxy.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nuvio-revalidate-'));
const assetDir='scripts/fixtures/uj630-images',files=fs.readdirSync(assetDir);const first=fs.readFileSync(path.join(assetDir,files[0])),second=fs.readFileSync(path.join(assetDir,files[1]));
let now=1000000,requests=[];
const handler=createImageProxyHandler({cacheDir:dir,maxImageBytes:65536,maxCacheBytes:180000,now:()=>now,transportGet(options,callback){const req=new EventEmitter();req.abort=()=>{};requests.push({options,reply(status,body,headers={}){const res=new PassThrough();res.statusCode=status;res.headers={'content-type':'image/jpeg',...headers};callback(res);res.end(body)}});return req}});
function request(){const chunks=[],res=new Writable({write(c,e,d){chunks.push(c);d()}});res.writeHead=code=>res.status=code;const p=new Promise(resolve=>res.on('finish',()=>resolve({status:res.status,body:Buffer.concat(chunks)})));handler({method:'GET',url:'/image-proxy?url='+encodeURIComponent('https://image.tmdb.org/t/p/w342/fixture.jpg')},res);return p}
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));};
function verifyBytes(){const actual=fs.readdirSync(dir).reduce((n,f)=>n+fs.statSync(path.join(dir,f)).size,0);assert(actual<=180000);assert.equal(actual,handler.getStats().bytes);assert.equal(handler.getStats().reserved,0);}
try{
 const initial=request();assert.equal(requests.length,1);requests[0].reply(200,first,{etag:'"v1"','last-modified':'Mon, 14 Sep 2026 00:00:00 GMT'});assert.deepEqual((await initial).body,first);verifyBytes();
 await request();assert.equal(requests.length,1,'fresh image not redownloaded');
 now+=86400001;const stale=await request();assert.deepEqual(stale.body,first,'visible old image retained during revalidation');
 assert.equal(requests[1].options.headers['If-None-Match'],'"v1"');assert(requests[1].options.headers['If-Modified-Since']);
 requests[1].reply(304);await settle();verifyBytes();await request();assert.equal(requests.length,2,'304 updates freshness without replacing pixels');
 now+=86400001;await request();requests[2].reply(200,second,{etag:'"v2"'});await settle();assert.deepEqual((await request()).body,second,'same URL accepts validated newer image');verifyBytes();
 now+=86400001;await request();const rename=fs.renameSync;
 try{fs.renameSync=(from,to)=>{if(from.endsWith('.meta.part'))throw Object.assign(Error('storage full'),{code:'ENOSPC'});return rename(from,to)};requests[3].reply(200,first,{etag:'"v3"'});await settle();}finally{fs.renameSync=rename}
 assert.deepEqual((await request()).body,second,'failed atomic replacement preserves last valid entry');verifyBytes();
 assert.equal(requests.length,4,'failure backoff does not loop');
 const smallDir=fs.mkdtempSync(path.join(os.tmpdir(),'nuvio-revalidate-full-'));
 try{for(const f of fs.readdirSync(dir))fs.copyFileSync(path.join(dir,f),path.join(smallDir,f));let calls=0;
 const constrained=createImageProxyHandler({cacheDir:smallDir,maxImageBytes:65536,maxCacheBytes:handler.getStats().bytes+100,now:()=>now+86400001,transportGet(){calls++;throw Error('must not start')}});
 const result=await new Promise(resolve=>{const chunks=[],res=new Writable({write(c,e,d){chunks.push(c);d()}});res.writeHead=()=>{};res.on('finish',()=>resolve(Buffer.concat(chunks)));constrained({method:'GET',url:'/image-proxy?url='+encodeURIComponent('https://image.tmdb.org/t/p/w342/fixture.jpg')},res)});
 assert.deepEqual(result,second);assert.equal(calls,0,'no download without replacement reservation');assert(constrained.getStats().bytes+constrained.getStats().reserved<=constrained.getStats().maxBytes);
 }finally{fs.rmSync(smallDir,{recursive:true,force:true})}
 console.log('PASS image freshness 24h, ETag/Last-Modified/304, same-URL replacement, old pixels during revalidation, atomic ENOSPC rollback, full cache reservation and exact byte accounting.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
