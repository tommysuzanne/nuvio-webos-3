import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {syncResult} from '../js/core/sync/syncResult.js';
let profile=1,session={},now=1000000,calls=[],responses=[],notifications=0;const success=new Map();
const code=fs.readFileSync('js/core/profile/collectionRefreshService.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const service=vm.runInNewContext(code+';CollectionRefreshService;', {Map,Set,Promise,Date:{now:()=>now},String,syncResult,
 isUj630CollectionsReadOnly:()=>true,AuthManager:{isAuthenticated:true,getSessionSignal:()=>session},ProfileManager:{getActiveProfileId:()=>profile},collectionSyncScope:(p=profile)=>'account:'+p,
 getCollectionSurfaceSuccess:(surface,p)=>success.get(p+surface)||0,
 CollectionSyncService:{pullWithStatus:p=>{calls.push('collections'+p);return new Promise(r=>responses.push(result=>{if(result.ok)success.set(p+'collections',now);r(result)}))}},
 HomeCatalogSettingsSyncService:{pullWithStatus:async p=>{calls.push('organization'+p);success.set(p+'organization',now);return syncResult('unchanged')}}
});
service.subscribe(()=>notifications++);
const a=service.request(),b=service.request({force:true});assert.equal(a,b,'simultaneous full/manual/eligible reads coalesce');assert.equal(calls.length,1);
responses.shift()(syncResult('changed'));assert.equal((await a).status,'changed');assert.equal(calls.length,2);assert.equal(notifications,1,'one notification after both surfaces');
await service.request();assert.equal(calls.length,2,'fresh collections do not pull');
now+=300001;const failed=service.request();responses.shift()(syncResult('error'));assert.equal((await failed).ok,false);assert.equal(calls.length,3,'organization not read after invalid collections');
assert(success.get('1collections')<now);const retry=service.request();responses.shift()(syncResult('unchanged'));await retry;assert.equal(calls.length,5,'error does not reset five-minute success clock');
const old=service.request({force:true});session={};const fresh=service.request({force:true});assert.notEqual(old,fresh,'new session never joins old request');responses.shift()(syncResult('cancelled'));responses.shift()(syncResult('unchanged'));await Promise.all([old,fresh]);
profile=2;const other=service.request();assert.equal(calls.at(-1),'collections2');responses.shift()(syncResult('unchanged'));await other;
console.log('PASS targeted refresh: 5min success freshness, full/manual coalescing, one publication, failure retry eligibility, session/profile separation.');
