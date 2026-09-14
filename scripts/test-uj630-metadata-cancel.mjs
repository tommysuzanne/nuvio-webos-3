import { createUj630Cache } from "../js/core/cache/uj630Caches.js";
import { metadataContextRevision, onMetadataContextChanged } from "../js/core/cache/cacheContext.js";
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const calls=[];const source=fs.readFileSync(new URL('../js/data/repository/metaRepository.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const context=vm.createContext({createUj630Cache,metadataContextRevision,onMetadataContextChanged,console,Map,Set,Promise,Number,String,Boolean,Array,URL,encodeURIComponent,
 addonRepository:{canonicalizeUrl:x=>x,getInstalledAddons:async()=>[{baseUrl:'a',resources:[]},{baseUrl:'b',resources:[]}],resolveResourceRequestType:()=> 'series'},
 safeApiCall:async fn=>{try{return {status:'success',data:await fn()}}catch{return {status:'error'}}},
 MetaApi:{getMeta:(url,options)=>new Promise((resolve,reject)=>{calls.push({url,options,resolve});options.signal?.addEventListener('abort',()=>reject(Error('aborted')),{once:true})})}});
vm.runInContext(source,context);const repo=vm.runInContext('metaRepository',context);repo.resolveDirectMetaType=async()=> 'series';repo.mapMeta=x=>x;
const tick=()=>new Promise(r=>setImmediate(r));
const ordinary=repo.getMeta('a','series','tt1');await tick();assert.equal(calls.length,1);
const controller=new AbortController();const scoped=repo.getMeta('a','series','tt1',{signal:controller.signal,timeoutMs:10000});await tick();assert.equal(calls.length,2);assert.equal(calls[1].options.timeoutMs,10000);
controller.abort();assert.equal((await scoped).status,'error');assert.equal(repo.inFlightMeta.size,1,'Cancelling Home does not delete another screen’s shared request');
calls[0].resolve({meta:{id:'tt1',name:'ok'}});assert.equal((await ordinary).status,'success');assert.equal(repo.inFlightMeta.size,0);
const c2=new AbortController();let count=0;repo.getMeta=async()=>{count++;c2.abort();return {status:'error'}};
const result=await repo.getMetaFromAllAddons('series','tt2',null,{signal:c2.signal,timeoutMs:10000});assert.equal(result.status,'error');assert.equal(count,1,'No next provider after cancellation');assert.equal(repo.inFlightMetaAll.size,0);
console.log('PASS scoped metadata abort reaches transport, timeout is forwarded, no further provider starts, and foreground shared requests remain independent.');
