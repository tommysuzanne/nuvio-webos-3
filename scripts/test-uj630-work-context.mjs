import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const strip = path => fs.readFileSync(path,'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let clock=1000,next=0,revision=0;
const frames=new Map(),timers=new Map(),contextListeners=[];
const context=vm.createContext({Map,Set,Array,Math,Promise,Error,AbortController,console,
 Date:{now:()=>clock},supportsUj630Performance:()=>true,metadataContextRevision:()=>revision,
 onMetadataContextChanged:fn=>contextListeners.push(fn),
 requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id),
 setTimeout:(fn,delay=0)=>{timers.set(++next,{fn,at:clock+delay});return next},clearTimeout:id=>timers.delete(id)});
vm.runInContext(strip('js/platform/uj630Activity.js'),context);
// Both real modules in one VM would collide on module-private bindings; use an IIFE.
const activity=vm.runInContext('({captureUj630Owner,onUj630ActivityChange,shouldDeferUj630Work,noteUj630Input,setUj630ActivityRoute,deferUj630Work,uj630ActivityStats})',context);
const reads=vm.runInContext('(function(){'+strip('js/core/network/uj630ReadContext.js')+';return {withUj630Read,tryAcquireUj630ReadSlot,uj630ReadStats};})()',context);
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
async function tick(ms=17){clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn()};const list=[...frames];frames.clear();list.forEach(([,fn])=>fn());await settle();}
activity.setUj630ActivityRoute('home');activity.noteUj630Input();
let started=[],resolvers=[];
for(let i=0;i<4;i++)assert(activity.deferUj630Work('job'+i,()=>{started.push(i);return new Promise(r=>resolvers.push(r))}));
await tick(160);assert.equal(started.length,1,'one deferred task per frame');
await tick();assert.equal(started.length,2);await tick();assert.equal(started.length,2,'two asynchronous tasks at most');
resolvers.shift()();await settle();await tick();assert.equal(started.length,3);
activity.setUj630ActivityRoute('detail');resolvers.forEach(r=>r());await settle();await tick();assert.equal(started.length,3,'unmounted screen tasks discarded');
assert.equal(activity.uj630ActivityStats().pending,0);
// A dispatched recursive task must run once instead of endlessly enqueueing itself.
activity.noteUj630Input();let recursiveRuns=0;
function recursive(){if(activity.deferUj630Work('recursive',recursive))return;recursiveRuns++;}
recursive();await tick(260);assert.equal(recursiveRuns,1);await settle();
// Metadata and image leases share the same cap; waiting reads cancel without starting.
activity.setUj630ActivityRoute('home');
const imageRelease=reads.tryAcquireUj630ReadSlot();assert.equal(typeof imageRelease,'function');
let calls=0,signals=[],resolveRead;
const first=reads.withUj630Read(signal=>{calls++;signals.push(signal);return new Promise(r=>resolveRead=r)});
const cancel=new AbortController();
const queued=reads.withUj630Read(()=>{calls++;},{signal:cancel.signal}).catch(e=>e);
await tick();assert.equal(calls,1);assert.equal(reads.uj630ReadStats().active,2);
assert.equal(reads.tryAcquireUj630ReadSlot(),null);
cancel.abort();assert.equal((await queued).name,'AbortError');assert.equal(reads.uj630ReadStats().queued,0);
resolveRead('ok');assert.equal(await first,'ok');imageRelease();await tick();
assert.equal(reads.uj630ReadStats().active,0);
// A route switch aborts the actual transport signal and releases the lease.
const transport=reads.withUj630Read(signal=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{const e=new Error('transport');e.name='AbortError';reject(e)}))).catch(e=>e);
await tick();activity.setUj630ActivityRoute('folderDetail');assert.equal((await transport).name,'AbortError');
assert.equal(reads.uj630ReadStats().active,0);
const old=reads.withUj630Read(async()=>{revision++;contextListeners.forEach(fn=>fn());return 'old-profile'}).catch(e=>e);
await tick();assert.equal((await old).name,'AbortError');
await tick();assert.equal(reads.uj630ReadStats().contexts,0);assert.equal(frames.size,0);assert.equal(timers.size,0,'idle leaves no permanent scheduler');
console.log('PASS real deferred scheduler: ownership, one start/frame, two tasks; shared image/read leases; queued/active abort, stale context, idle cleanup.');
