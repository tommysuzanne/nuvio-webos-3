import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {parse} from 'acorn';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function strip(path){let s=fs.readFileSync(path,'utf8');const a=parse(s,{ecmaVersion:'latest',sourceType:'module'});for(const n of a.body.filter(n=>n.type==='ImportDeclaration').reverse())s=s.slice(0,n.start)+s.slice(n.end);return s.replace(/export /g,'');}
let calls=[],transportActive=0;
const luna={isAvailable:()=>true,request:async(url,o)=>{
 calls.push(o);
 if(o.method==='cancelProxyRead')return {returnValue:true};
 transportActive++;
 return new Promise((resolve,reject)=>{o.signal.addEventListener('abort',()=>{transportActive--;const e=Error('cancel');e.name='AbortError';reject(e)})});
}};
const companion=vm.runInNewContext(strip('js/platform/webos/webosCompanionService.js')+';requestWebOsCompanionService;',{Set,Promise,String,Number,Date,Error,Object,setTimeout,clearTimeout,WebOsLunaService:luna});
const proxy=vm.runInNewContext(strip('js/platform/webos/webosSupabaseProxy.js')+';fetchViaWebOsSupabaseProxy;',{URL,Set,Array,String,Number,Promise,Error,console,setTimeout,clearTimeout,Environment:{isWebOS:()=>true},isWebOsCompanionServiceAvailable:()=>true,requestWebOsCompanionService:companion});
const control=new AbortController();const request=proxy('https://api.nuvio.tv/rest/v1/fixture',{signal:control.signal}).catch(e=>e);
assert.equal(transportActive,1);control.abort();assert.equal((await request).name,'AbortError','Voluntary cancellation must not become null (network fallback)');
assert.equal(transportActive,0);assert.equal(calls.length,2);assert.equal(calls[1].method,'cancelProxyRead');assert.equal(calls[0].parameters.requestId,calls[1].parameters.requestId);
assert.equal(calls[0].signal,control.signal);
const cancelled=new AbortController();cancelled.abort();assert.equal((await proxy('https://api.nuvio.tv/rest/v1/fixture',{signal:cancelled.signal}).catch(e=>e)).name,'AbortError');assert.equal(calls.length,2,'already-aborted read never starts');
// Actual ES5 service context follows every socket, including redirect/probe sockets.
const contexts=require('../services/webos/src/requestContext.js');const context=contexts.create();let destroyed=[];
const socket=id=>({destroy(){destroyed.push(id)}});const first=socket('probe'),second=socket('redirect');
contexts.add(context,first);contexts.add(context,second);contexts.remove(context,first);contexts.cancel(context);contexts.cancel(context);contexts.add(context,socket('late'));
assert.deepEqual(destroyed,['redirect','late']);assert.equal(context.requests.length,0);
for(const file of ['requestContext','supabaseProxy','serverHost'])parse(fs.readFileSync(`services/webos/src/${file}.js`,'utf8'),{ecmaVersion:5});
console.log('PASS actual proxy -> companion -> Luna signal/remote cancel ID; no fallback/retry; already-cancelled read; ES5 service sockets destroyed across cancellation.');
