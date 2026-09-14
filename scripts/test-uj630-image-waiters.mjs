import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import assert from 'node:assert/strict'; import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events'; import {Writable,PassThrough} from 'node:stream';
const require=createRequire(import.meta.url),{createImageProxyHandler}=require('../services/webos/src/imageProxy.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nuvio-image-waiters-'));
const art=path.resolve('scripts/fixtures/uj630-images'),name=fs.readdirSync(art)[0],bytes=fs.readFileSync(path.join(art,name));
let now=Date.now(),requests=[];
const handler=createImageProxyHandler({cacheDir:dir,fallbackDir:art,now:()=>now,transportGet(options,callback){
  const req=new EventEmitter();req.aborted=false;req.abort=()=>{req.aborted=true};
  requests.push({req,options,reply(status,body,headers={}){const res=new PassThrough();res.statusCode=status;res.headers={'content-type':'image/jpeg',...headers};callback(res);res.end(body)}});return req;
}});
function request(id='one'){
  let done=false;const chunks=[],res=new Writable({write(c,e,d){chunks.push(c);d()}});
  res.writeHead=(status,headers)=>{res.status=status;res.headers=headers};
  const promise=new Promise(resolve=>res.on('finish',()=>{done=true;resolve({status:res.status,headers:res.headers,body:Buffer.concat(chunks)})}));
  handler({method:'GET',url:'/image-proxy?wait=1&fallback='+name+'&url='+encodeURIComponent('https://image.tmdb.org/t/p/w342/'+id+'.jpg')},res);
  return {res,promise,get done(){return done}};
}
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r))};
try {
  const a=request(),b=request();await settle();assert(!a.done&&!b.done,'fallback does not detach a background download');assert.equal(requests.length,1);
  a.res.destroy();await settle();assert(!requests[0].req.aborted,'second waiter retains the shared download');
  b.res.destroy();await settle();assert(requests[0].req.aborted);assert.equal(handler.getStats().active,0);assert.equal(handler.getStats().reserved,0);
  const c=request();assert.equal(requests.length,2,'voluntary cancellation does not poison retries');
  requests[1].reply(200,bytes,{etag:'"v1"'});const initial=await c.promise;assert.deepEqual(initial.body,bytes);assert.equal(initial.headers['X-Nuvio-Image-Fresh'],'1');
  now+=86400001;const stale=request();await settle();assert(!stale.done,'stale response retains its read lease until validation');
  assert.equal(requests[2].options.headers['If-None-Match'],'"v1"');requests[2].reply(304);assert.equal((await stale.promise).headers['X-Nuvio-Image-Fresh'],'1');
  const failed=request('unavailable');requests[3].reply(503);const fallback=await failed.promise;
  assert.deepEqual(fallback.body,bytes);assert.equal(fallback.headers['X-Nuvio-Image-Origin'],'embedded');assert.equal(fallback.headers['X-Nuvio-Image-Fresh'],'0');
  assert.equal(handler.getStats().active,0);assert.equal(handler.getStats().reserved,0);
  console.log('PASS image wait=1: retained HTTP lease, duplicate waiters, real last-waiter abort, cancellation retry, 304 and stale/embedded fallback headers.');
} finally {fs.rmSync(dir,{recursive:true,force:true})}
