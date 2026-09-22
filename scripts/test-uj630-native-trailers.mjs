import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const source=fs.readFileSync('services/webos/src/nativeTrailers.js','utf8');
const provider=require('../services/webos/src/nativeTrailers.js');
const contexts=require('../services/webos/src/requestContext.js');
const escaped=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const model=v=>`<figure data-model="${escaped(JSON.stringify({videos:[v]}))}"></figure>`;
const row=(id,name,year,original='')=>`<span class="${'ACr'+Buffer.from('/film/fichefilm_gen_cfilm='+id+'.html').toString('base64')} meta-title-link">${name}</span><span class="date">1 janvier ${year}</span><span>Titre original </span><span>${original}</span>`;
const results=provider.searchResults(row(1,'Le Film',2020,'The Film')+row(2,'Le Film',1990),'movie');
assert.equal(provider.matchEntity(results,{title:'The Film',year:2020}).path,'/film/fichefilm_gen_cfilm=1.html');
assert.equal(provider.matchEntity(results,{title:'Le Film'}),null,'Ambiguous remakes must never autoplay');
assert.equal(provider.matchEntity(results,{title:'Le Film',year:2024}),null);
assert.equal(provider.matchEntity(results,{title:'Film',year:2020}),null,'No loose title matching');
const selection={id:'12',entityId:'1',language:'VF',type:'movie'};
const v={id:12,relatedEntityId:1,relatedEntityType:'movie',title:'Le Film Bande-annonce VF',file_type:'TRAILER'};
const candidates=model(v)+`<a class="meta-title-link" href="/video/player_gen_cmedia=13&amp;cfilm=1.html">Le Film Bande-annonce VOST</a><a class="meta-title-link" href="/video/player_gen_cmedia=14&amp;cfilm=2.html">Wrong film Bande-annonce VO</a>`;
assert.deepEqual(provider.trailers(candidates,'1','movie').map(x=>x.language),['VF','VOST']);
const url='https://fr.vid.web.acsta.net/public/trailer.mp4';
const ld=`<script type="application/ld+json">${JSON.stringify({'@type':'VideoObject',embedUrl:'https://player.allocine.fr/12.html',contentUrl:url})}</script>`;
assert.equal(provider.streamUrl(model(v)+ld,selection),url);
assert.throws(()=>provider.streamUrl(model({...v,relatedEntityId:999})+ld,selection),/MISMATCH/);
assert.throws(()=>provider.streamUrl(model(v)+ld.replace('fr.vid.web.acsta.net','evil.test'),selection),/UNAVAILABLE/);
const multi={...v,sources:{hd:{url:url+'?hd',height:720},fhd:{url:url+'?fhd',height:1080},uhd:{url:url+'?uhd',height:2160}}};
assert.equal(provider.streamUrl(model(multi)+ld,selection),url+'?fhd','Prefer advertised 1080; do not select 4K or manufacture quality URLs');
const request=(p,q,ctx={cancelled:false,requests:[]})=>new Promise((resolve,reject)=>p(q,ctx,(e,r)=>e?reject(e):resolve(r)));
let reads=0;
const fixtureProvider=provider.createProvider((path,ctx,done)=>{reads++;done(null,path.indexOf('rechercher')>=0?row(10,'Fixture Movie',2024):candidates.replace(/cfilm=1/g,'cfilm=10').replace(/relatedEntityId&quot;:1/g,'relatedEntityId&quot;:10'));});
await request(fixtureProvider,{title:'Fixture Movie',year:2024});const first=reads;
await request(fixtureProvider,{title:'Fixture Movie',year:2024});assert.equal(reads,first,'Valid metadata cache only');
for(let i=0;i<13;i++)await request(provider.createProvider((path,ctx,done)=>done(null,path.indexOf('rechercher')>=0?row(1,'Fixture '+i,2024):candidates)),{title:'Fixture '+i,year:2024});
await request(fixtureProvider,{title:'Fixture Movie',year:2024});assert(reads>first,'Cache evicts beyond 12 entries');
await assert.rejects(request(provider.request,{action:'resolve',selection:{...selection,id:'../../bad'}}),/INVALID/);

// Real transport must terminate on cancellation, response limits and timeout.
let httpRequest,httpResponse,deadline;
function transportProvider(){
 const mod={exports:{}};
 const https={get(options,cb){
  assert.equal(options.hostname,'www.allocine.fr');assert.equal(options.headers['Accept-Encoding'],'identity');
  httpRequest=new EventEmitter();httpRequest.destroy=()=>{httpRequest.destroyed=true;httpRequest.emit('close');};
  httpRequest.deliver=()=>{httpResponse=new EventEmitter();httpResponse.statusCode=200;httpResponse.headers={};httpResponse.destroy=()=>httpResponse.emit('close');cb(httpResponse);};return httpRequest;
 }};
 vm.runInNewContext(source,{module:mod,require:name=>name==='https'?https:contexts,Buffer,Date,setTimeout:f=>{deadline=f;return 1},clearTimeout:()=>{deadline=null}});
 return mod.exports.request;
}
let ctx=contexts.create();let outcome=request(transportProvider(),{title:'x'},ctx);contexts.cancel(ctx);await assert.rejects(outcome,/CANCELLED/);assert.equal(ctx.requests.length,0);assert.equal(deadline,null);
ctx=contexts.create();outcome=request(transportProvider(),{title:'x'},ctx);httpRequest.deliver();httpResponse.emit('data',Buffer.alloc(1024*1024+1));await assert.rejects(outcome);assert(httpRequest.destroyed);assert.equal(ctx.requests.length,0);
ctx=contexts.create();outcome=request(transportProvider(),{title:'x'},ctx);deadline();await assert.rejects(outcome,/TIMEOUT/);assert(httpRequest.destroyed);

// Cancellation also completes the service message/activity and frees its slot.
const indexSource=fs.readFileSync('services/webos/src/index.js','utf8');
const handlerBlock=indexSource.slice(indexSource.indexOf('// Trailer lookups share'),indexSource.indexOf('registerSafeHttpProxyCommand("supabaseProxy");'));
let handler,serviceCallback,serviceContext;const replies=[];const registry={};
const sandbox={service:{register:(name,fn)=>{handler=fn;}},require:()=>({request:(p,c,cb)=>{serviceContext=c;serviceCallback=cb;}}),getMessagePayload:m=>m.payload,respond:(m,r)=>replies.push(r),requestContexts:contexts,activeProxyReads:registry};
vm.runInNewContext(handlerBlock,sandbox);
handler({payload:{requestId:'test-cancel',title:'Fixture'}});contexts.cancel(serviceContext);serviceCallback(Error('CANCELLED'));
assert.equal(replies.length,1);assert.equal(replies[0].errorCode,-2);assert.equal(Object.keys(registry).length,0);assert.equal(sandbox.activeTrailerReads,0);

// Dialog ownership: Back/unmount aborts reads and rejects late callbacks; media
// controls operate on the native element and release it without progress writes.
const uiSource=fs.readFileSync('js/ui/components/nativeTrailerDialog.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const listeners=new Map();let dialogOptions;
class Node {constructor(tag){this.tag=tag;this.children=[];this.paused=true;this.currentTime=0;this.videoHeight=1080;}appendChild(n){this.children.push(n);return n;}setAttribute(){}removeAttribute(name){delete this[name];}remove(){this.removed=true;}play(){this.paused=false;this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;this.onpause?.();}load(){this.loaded=true;}}
const doc={body:new Node('body'),createElement:t=>new Node(t),addEventListener:()=>{},removeEventListener:()=>{},activeElement:null};
const ui=vm.runInNewContext(uiSource+';({NativeTrailerDialog,nativeTrailerQuery})',{NuvioDialog:class{constructor(o){dialogOptions=o;}mount(){return this;}destroy(){}},requestWebOsCompanionService:()=>{},focusWithoutScroll:n=>{doc.activeElement=n;},document:doc,window:{addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)},AbortController,setTimeout,clearTimeout});
assert.equal(ui.nativeTrailerQuery({name:'Film',releaseInfo:'2024–',type:'series'}).year,2024);
let resolveRead,signal,restored=0;const d=new ui.NativeTrailerDialog({query:{title:'Film'},onClose:()=>restored++,request:args=>{signal=args.signal;return new Promise(r=>{resolveRead=r;});}});
const opening=d.open();d.close();resolveRead({payload:{result:{choices:[selection]}}});await opening;assert(signal.aborted);assert.equal(restored,1);d.close();assert.equal(restored,1);
const player=new ui.NativeTrailerDialog({query:{title:'Film'},onClose:()=>restored++});player.play(url,{title:'Film VF',language:'VF'});const video=player.video;assert(!video.paused);
const key=code=>listeners.get('keydown')?.({keyCode:code,preventDefault(){},stopImmediatePropagation(){}});
key(13);assert(video.paused);key(13);assert(!video.paused);key(461);assert(video.paused);assert(video.loaded);assert.equal(video.src,undefined);assert.equal(listeners.size,0);assert.equal(restored,2);
console.log('PASS native trailer matching, VO/VF, 1080 preference, bounded cache/HTTP, cancellation, pause/return and stale-screen isolation.');
