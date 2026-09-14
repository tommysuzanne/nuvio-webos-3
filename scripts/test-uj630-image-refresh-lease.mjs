import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {UJ630_BUDGETS} from '../js/platform/uj630Budgets.js';
const strip=p=>fs.readFileSync(p,'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let clock=1000,seq=0,normalizations=0,blobSeq=0;const frames=new Map(),timers=new Map(),requests=[],probes=[],revoked=[],assignments=[];
function node(){const handlers={};let src='';return {connected:true,dataset:{},naturalWidth:320,naturalHeight:180,classList:{contains:()=>false,add(){},remove(){}},get src(){return src},set src(value){src=value;assignments.push({at:clock,src:value})},getAttribute:()=>src,removeAttribute:key=>{if(key==='src')src=''},addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener:name=>delete handlers[name],emit:name=>handlers[name]?.()}}
const url='https://image.tmdb.org/t/p/w500/cover.jpg';let hash=2166136261;for(let i=0;i<url.length;i++)hash=Math.imul(hash^url.charCodeAt(i),16777619);const artwork={[`${(hash>>>0).toString(16)}-${url.length}`]:'fixture.jpg'};
class Url extends URL {static createObjectURL(){return 'blob:fixture-'+(++blobSeq)}static revokeObjectURL(url){revoked.push(url)}}
const context=vm.createContext({Map,Set,Array,Math,Promise,Error,AbortController,console,String,Number,Boolean,UJ630_BUDGETS,URL:Url,
 Date:{now:()=>clock},supportsUj630Performance:()=>true,metadataContextRevision:()=>0,onMetadataContextChanged:()=>{},createUj630Cache:()=>new Map(),
 requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(fn,delay=0)=>{timers.set(++seq,{fn,at:clock+delay});return seq},clearTimeout:id=>timers.delete(id),
 document:{documentElement:{contains:n=>n.connected},querySelectorAll:()=>[]},UJ630_ARTWORK:artwork,tmdbImageAtSize:x=>x,
 normalizeImageUrl:x=>{normalizations++;return 'http://127.0.0.1:2710/image-proxy?url='+encodeURIComponent(x)},onWebOsImageProxyReady:()=>{},retainWebOsImageProxy(){},releaseWebOsImageProxy(){},
 Image:function(){const image=node();Object.defineProperty(image,'onload',{set:fn=>{if(fn)image.addEventListener('load',fn);else image.removeEventListener('load')}});Object.defineProperty(image,'onerror',{set:fn=>{if(fn)image.addEventListener('error',fn);else image.removeEventListener('error')}});probes.push(image);return image},
 fetch:(url,{signal})=>new Promise((resolve,reject)=>{const request={url,signal,reply:()=>resolve({ok:true,headers:{get:()=> '1'},blob:async()=>({size:1024})})};signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})));requests.push(request)})});
for(const [file,exports] of [['js/platform/uj630Activity.js','isUj630ActivityHidden,captureUj630Owner,onUj630ActivityChange,shouldDeferUj630Work,noteUj630Input,setUj630ActivityRoute'],['js/core/network/uj630ReadContext.js','tryAcquireUj630ReadSlot,onUj630ReadSlotAvailable,createUj630ReadContext,withUj630Read,uj630ReadStats']])Object.assign(context,vm.runInContext('(function(){'+strip(file)+';return {'+exports+'};})()',context));
context.setUj630ActivityRoute('home');
const images=vm.runInContext('(function(){'+strip('js/core/media/uj630Images.js')+';return Uj630Images;})()',context);
const tick=async(ms=34)=>{clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn()};const ready=[...frames];frames.clear();ready.forEach(([,fn])=>fn());for(let i=0;i<20;i++)await Promise.resolve()};
const visible=node();visible.dataset.src=url;const root={classList:{contains:()=>false},querySelectorAll:()=>[visible]};
images.enqueueTree(root);await tick();assert.equal(visible.src,'assets/uj630-artwork/fixture.jpg');assert.equal(normalizations,0,'embedded cover avoids URL polyfills on the first paint');
visible.emit('load');await tick();assert.equal(requests.length,1);assert.match(requests[0].url,/wait=1/);assert.equal(context.uj630ReadStats().active,1,'refresh holds common lease for the full response');
images.interact();context.noteUj630Input();await tick();assert(requests[0].signal.aborted);assert.equal(context.uj630ReadStats().active,0);assert.equal(visible.src,'assets/uj630-artwork/fixture.jpg');
await tick(170);await tick();assert.equal(requests.length,2);requests[1].reply();await tick();await tick();assert.equal(probes.length,1);assert.equal(visible.src,'assets/uj630-artwork/fixture.jpg','old cover remains until replacement decodes');
probes[0].emit('load');await tick();assert.match(visible.src,/blob:fixture-/);visible.emit('load');assert.equal(context.uj630ReadStats().active,0);assert.equal(revoked.length,1);
images.releaseAll();await tick();assert.equal(images.stats().tracked,0);assert.equal(timers.size,0);assert.equal(context.uj630ReadStats().contexts,0);assert.equal(frames.size,0);
for(let i=1;i<assignments.length;i++)assert(assignments[i].at-assignments[i-1].at>=34,'visible and decoder assignments share frame pacing');
console.log('PASS actual image + shared read scheduler: immediate embedded cover, held revalidation lease, navigation abort, retained old pixels, decoder validation, one assignment/34ms, Blob/lease/timer cleanup.');
