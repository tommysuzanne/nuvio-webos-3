import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture() {
 let xhr, deadline, cleared=0;
 class Request {
  constructor(){xhr=this;this.headers={};this.status=206;this.readyState=1;this.responseText='';this.aborted=false;}
  open(){} setRequestHeader(k,v){this.headers[k]=v;} send(){}
  getResponseHeader(k){return this.responseHeaders?.[k] || null;}
  abort(){this.aborted=true;this.onabort?.();}
 }
 const s=fs.readFileSync('js/core/player/dolbyVisionProbe.js','utf8').replace(/export /g,'');
 const probe=vm.runInNewContext(s+';detectarEntradaDolbyVision;',{
  XMLHttpRequest:Request,setTimeout:fn=>{deadline=fn;return 1;},clearTimeout:()=>cleared++
 });
 return {probe,get xhr(){return xhr;},expire:()=>deadline(),get cleared(){return cleared;}};
}
let f=fixture(),p=f.probe('https://media.invalid/movie.mp4');f.expire();
assert.equal(await p,'desconhecido');assert(f.xhr.aborted,'deadline must stop transport, not just settle promise');
f=fixture();p=f.probe('https://media.invalid/movie.mp4');f.xhr.status=200;f.xhr.readyState=2;f.xhr.onreadystatechange?.();
assert(f.xhr.aborted,'reject ignored Range at headers, before body');assert.equal(await p,'desconhecido');
f=fixture();p=f.probe('https://media.invalid/movie.mp4');f.xhr.responseHeaders={'Content-Length':'4294967296'};f.xhr.readyState=2;f.xhr.onreadystatechange?.();
assert(f.xhr.aborted,'oversized partial response rejected');assert.equal(await p,'desconhecido');
f=fixture();p=f.probe('https://media.invalid/movie.mp4');f.xhr.onprogress?.({loaded:4097});
assert(f.xhr.aborted,'body guard works when length header is missing');assert.equal(await p,'desconhecido');
for(const [body,expected] of [['moov stsd dvhe','dolby-vision-sample-entry'],['moov stsd hev1','compativel'],['ftyp','desconhecido']]){
 f=fixture();p=f.probe('https://media.invalid/movie.mp4');f.xhr.responseText=body;f.xhr.readyState=4;f.xhr.onload();
 assert.equal(await p,expected);assert(f.cleared>0);
}
f=fixture();assert.equal(await f.probe('https://media.invalid/movie.mkv'),'desconhecido');assert.equal(f.xhr,undefined);
console.log('PASS MP4 probe aborts expired/ignored/oversized transfers and preserves bounded format detection.');
