import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let revision=0,listener,calls=0,requests=[];
const ctx=vm.createContext({Map,Set,Promise,Error,AbortController,supportsUj630Performance:()=>true,metadataContextRevision:()=>revision,onMetadataContextChanged:fn=>listener=fn});
vm.runInContext(fs.readFileSync('js/core/media/uj630CatalogRead.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,''),ctx);
const share=vm.runInContext('shareUj630CatalogRead',ctx),tick=()=>new Promise(setImmediate);
function read(signal){calls++;return new Promise((resolve,reject)=>{requests.push({signal,resolve});signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'})))})}
const a=new AbortController(),b=new AbortController();
const first=share('provider|params|cursor',a.signal,read).catch(e=>e),second=share('provider|params|cursor',b.signal,read);await tick();assert.equal(calls,1);
a.abort();assert.equal((await first).name,'AbortError');assert(!requests[0].signal.aborted);requests[0].resolve({items:[1]});assert.deepEqual(await second,{items:[1]});
const c=new AbortController(),cancelled=share('other',c.signal,read).catch(e=>e);await tick();c.abort();assert.equal((await cancelled).name,'AbortError');assert(requests[1].signal.aborted);
const old=share('same',null,read).catch(e=>e);await tick();revision++;listener();assert.equal((await old).name,'AbortError');
const fresh=share('same',null,read);await tick();requests.at(-1).resolve({items:[2]});assert.deepEqual(await fresh,{items:[2]});
console.log('PASS shared catalog transport across callers, independent cancellation, last-waiter abort, context isolation and fresh same-cursor retry.');
