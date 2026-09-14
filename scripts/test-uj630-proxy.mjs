import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {Writable,PassThrough} from 'node:stream';
const require=createRequire(import.meta.url);
const {createImageProxyHandler,imageDimensions}=require('../services/webos/src/imageProxy.js');
const acorn=require('acorn');
acorn.parse(fs.readFileSync(new URL('../services/webos/src/imageProxy.js',import.meta.url),'utf8'),{ecmaVersion:5});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nuvio-proxy-test-'));
const artworkDir=new URL('./fixtures/uj630-images/',import.meta.url);
const payload=fs.readFileSync(new URL(fs.readdirSync(artworkDir)[0],artworkDir));
assert.ok(imageDimensions(payload,'image/jpeg'));
assert.equal(imageDimensions(Buffer.from('GIF89a'),'image/gif'),null);
let active=0,maximum=0,downloads=0,aborts=0;
const handler=createImageProxyHandler({cacheDir:dir,maxImageBytes:65536,maxCacheBytes:160000,transportGet(opts,callback){
  downloads++; active++; maximum=Math.max(maximum,active);
  const request=new EventEmitter();let stopped=false;
  request.abort=()=>{if(!stopped){stopped=true;active--;aborts++;}};
  setTimeout(()=>{
    if(stopped)return;
    const response=new PassThrough();response.statusCode=200;response.headers={'content-type':'image/jpeg'};
    callback(response); stopped=true;active--;response.end(payload);
  },10);
  return request;
}});
function request(index, cancel=false){
 const req={method:'GET',url:'/image-proxy?url='+encodeURIComponent('https://image.tmdb.org/t/p/w342/test'+index+'.jpg')};
 const chunks=[];const res=new Writable({write(chunk,encoding,done){chunks.push(chunk);done();}});
 res.writeHead=(status,headers)=>{res.status=status;res.headers=headers;};
 const promise=new Promise((resolve,reject)=>{res.on('finish',()=>resolve({status:res.status,body:Buffer.concat(chunks)}));res.on('error',reject);});
 assert.equal(handler(req,res),true);if(cancel){res.emit('close');return Promise.resolve();}return promise;
}
try{
 const result=await Promise.all([request(1),request(1)]);assert.equal(downloads,1);assert.equal(result[0].status,200);assert.deepEqual(result[1].body,payload);
 const all=await Promise.all(Array.from({length:25},(_,i)=>request(i+2)));
 all.forEach(result=>assert.equal(result.status,200));
 assert.ok(maximum<=2);let stats=handler.getStats();assert.ok(stats.bytes+stats.reserved<=160000);
 const actual=fs.readdirSync(dir).reduce((n,name)=>n+fs.statSync(path.join(dir,name)).size,0);assert.equal(actual,stats.bytes);
 await request('cancel',true);assert.ok(aborts>=1);
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json')))assert.equal(fs.readFileSync(path.join(dir,name),'utf8').includes('https:'),false);
 console.log(JSON.stringify({test:'image-proxy',status:'PASS',maximumConcurrent:maximum,downloads,cacheBytes:stats.bytes,actualCacheBytes:actual,cancelled:aborts,es5:true}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
