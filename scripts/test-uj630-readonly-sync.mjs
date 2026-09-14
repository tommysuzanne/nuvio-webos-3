import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
import {validateRemoteCollections, parseRemoteCollections, validateRemoteCatalogSettings} from '../js/core/sync/remoteCollectionSnapshot.js';
import {syncResult, syncError} from '../js/core/sync/syncResult.js';
import * as policy from '../js/platform/uj630Performance.js';

const root = new URL('../', import.meta.url);
function source(file) {
  let text = fs.readFileSync(new URL(file, root), 'utf8');
  const ast = parse(text, {ecmaVersion:'latest', sourceType:'module'});
  for (const n of ast.body.filter(n=>n.type==='ImportDeclaration').reverse()) text=text.slice(0,n.start)+text.slice(n.end);
  return text.replace(/export /g,'');
}
const ua={userAgent:'Mozilla/5.0 (Web0S) Chrome/38.0'};
Object.defineProperty(globalThis,'navigator',{value:ua,configurable:true});
const raw=new Map();let profile=1,storageWorks=true;
globalThis.localStorage={getItem:k=>raw.get(k)||null,setItem:(k,v)=>raw.set(k,v)};
const local={get:(k,d)=>raw.has(k)?JSON.parse(raw.get(k)):d,set:(k,v)=>{if(!storageWorks)return false;raw.set(k,JSON.stringify(v));return true}};
const context={stringifyStoredData:JSON.stringify,...policy,validateRemoteCollections,Map,Set,JSON,Date,Number,String,Array,Math,Boolean,
  console,setTimeout,clearTimeout,localStorage,LocalStore:local,
  ProfileManager:{getActiveProfileId:()=>profile},registerSessionTeardownHandler(){},getSyncBackoffRemainingMs:()=>0};
const create=vm.runInNewContext(source('js/data/local/profileScopedStore.js')+';createProfileScopedStore;',context);
const collections=vm.runInNewContext(source('js/data/local/collectionsStore.js')+';CollectionsStore;',{...context,createProfileScopedStore:create});
const organization=vm.runInNewContext(source('js/data/local/homeCatalogStore.js')+';HomeCatalogStore;',{...context,createProfileScopedStore:create});
const remote=[{id:'c',title:'Café / Discover',folders:[{id:'f',title:'Studio Ghibli',sources:[]}]}];
const current={isCurrent:()=>true};
collections.applyRemoteForProfile(1,remote,current);
organization.applyRemoteForProfile(1,{order:['collection:c'],disabled:[],customTitles:{}},current);
const before=new Map(raw);
for(const call of [()=>collections.replaceForProfile(1,[],{silentSync:true}),
  ()=>collections.replace([], {silentSync:true}),()=>organization.setOrder([], {silentSync:true}),
  ()=>organization.reset({silentSync:true}),()=>organization.toggleDisabled('c')])
  assert.throws(call,e=>e.code==='COLLECTIONS_READ_ONLY');
assert.deepEqual(raw,before);
organization.ensureOrderKeysWithPrefs(['collection:c','new']);assert.deepEqual(raw,before);
policy.setUj630PerformanceEnabled(false);assert(policy.isUj630CollectionsReadOnly());
assert.throws(()=>collections.replace([]),e=>e.code==='COLLECTIONS_READ_ONLY');
ua.userAgent='Chrome/130';collections.replaceForProfile(2,[],{silentSync:true});
ua.userAgent='Mozilla/5.0 (Web0S) Chrome/38.0';
assert.equal(collections.applyRemoteForProfile(1,[],{isCurrent:()=>false}),null);
assert.equal(collections.getForProfile(1).length,1);
storageWorks=false;assert.throws(()=>collections.applyRemoteForProfile(1,[],current));storageWorks=true;
assert.equal(collections.getForProfile(1).length,1,'Failed persistence cannot mutate the memoized envelope');
for(const bad of [null,{},[{collections_json:null}],[{}],[{collections_json:'invalid'}],
  [{collections_json:[...remote,...remote]}],[{collections_json:[{id:'c',title:'x',folders:{}}]}]])
  assert.throws(()=>parseRemoteCollections(bad),e=>e.code==='INVALID_REMOTE_SNAPSHOT');
assert.equal(parseRemoteCollections([{collections_json:[]}]).length,0);
assert.throws(()=>validateRemoteCatalogSettings({items:[{}]}));
assert.deepEqual(validateRemoteCatalogSettings({items:[]}),{items:[]});

let resolveRequest,session={},freshness=0,generation=0,calls=0;
const auth={isAuthenticated:true,getSessionSignal:()=>session};
const makeContext=()=>{const p=profile,s=session,g=++generation;return {signal:s,isCurrent:()=>p===profile&&s===session&&g===generation&&auth.isAuthenticated}};
const service=vm.runInNewContext(source('js/core/profile/collectionSyncService.js')+';CollectionSyncService;',{
  ...context,AuthManager:auth,CollectionsStore:collections,parseRemoteCollections,syncResult,syncError,
  createCollectionSyncContext:makeContext,recordCollectionSurfaceSuccess:()=>freshness++,isSyncBackoffActive:()=>false,
  SupabaseApi:{rpc:()=>{calls++;return new Promise(resolve=>resolveRequest=resolve)}}});
const failed=service.pullWithStatus(1);resolveRequest([{}]);assert.equal((await failed).status,'error');assert.equal(freshness,0);assert.equal(collections.getForProfile(1).length,1);
const stale=service.pullWithStatus(1);profile=2;resolveRequest([{collections_json:[]}]);assert.equal((await stale).status,'cancelled');assert.equal(freshness,0);profile=1;
const old=service.pullWithStatus(1),resolveOld=resolveRequest;const fresh=service.pullWithStatus(1);resolveRequest([{collections_json:remote}]);assert.equal((await fresh).status,'unchanged');resolveOld([{collections_json:[]}]);assert.equal((await old).status,'cancelled');
const signedOut=service.pullWithStatus(1);session={};resolveRequest([{collections_json:[]}]);assert.equal((await signedOut).status,'cancelled');
const empty=service.pullWithStatus(1);resolveRequest([{collections_json:[]}]);assert.equal((await empty).status,'changed');assert.equal(collections.getForProfile(1).length,0);assert.equal(freshness,2);
const count=calls;assert.equal(await service.push(1),false);service.triggerPush(1);assert.equal(calls,count);
console.log('PASS read-only stores and uploads, silentSync refusal, display-only order completion, non-TV compatibility, validated empty/invalid snapshots, failed storage, session/profile/generation isolation and success freshness.');
