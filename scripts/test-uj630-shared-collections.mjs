import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parse} from 'acorn';
import * as policy from '../js/platform/uj630Performance.js';import {parseRemoteCollections,validateRemoteCatalogSettings} from '../js/core/sync/remoteCollectionSnapshot.js';import {syncResult,syncError} from '../js/core/sync/syncResult.js';
let saved={collectionsSourceProfileId:1};Object.defineProperty(globalThis,'navigator',{value:{userAgent:'Web0S Chrome/38.0'},configurable:true});globalThis.localStorage={getItem:()=>JSON.stringify(saved)};
assert.equal(policy.getUj630CollectionSourceProfileId(2),1,'explicit shared collections use primary source');
saved={};assert.equal(policy.getUj630CollectionSourceProfileId(2),2,'default installations retain independent collections');saved={collectionsSourceProfileId:1};
function source(file){let s=fs.readFileSync(file,'utf8');const a=parse(s,{ecmaVersion:'latest',sourceType:'module'});for(const n of a.body.filter(n=>n.type==='ImportDeclaration').reverse())s=s.slice(0,n.start)+s.slice(n.end);return s.replace(/export /g,'');}
let requested,applied,success=0;const ctx={isCurrent:()=>true};const service=vm.runInNewContext(source('js/core/profile/collectionSyncService.js')+';CollectionSyncService;',{
 ...policy,parseRemoteCollections,syncResult,syncError,ProfileManager:{getActiveProfileId:()=>2},AuthManager:{isAuthenticated:true},isSyncBackoffActive:()=>false,createCollectionSyncContext:()=>ctx,recordCollectionSurfaceSuccess:()=>success++,registerSessionTeardownHandler(){},
 CollectionsStore:{normalizeCollections:x=>x,getForProfile:()=>[],applyRemoteForProfile:(p,data)=>{applied=p;return true}},SupabaseApi:{rpc:async(name,args)=>{requested=args.p_profile_id;return [{collections_json:[{id:'shared',title:'Shared',folders:[]}]}]}},setTimeout,clearTimeout,console
});
assert.equal((await service.pullWithStatus(2)).status,'changed');assert.equal(requested,1);assert.equal(applied,2,'apply to destination only; no active-profile change');assert.equal(success,1);assert.equal(await service.push(2),false);
// The remote array can differ from its display order. Both content and order
// must come from the selected source, while Library remains destination-scoped.
let organization = {order: []}, organizationProfile;
const home = vm.runInNewContext(source('js/core/profile/homeCatalogSettingsSyncService.js')+';HomeCatalogSettingsSyncService;', {
 ...policy,validateRemoteCatalogSettings,syncResult,syncError,
 ProfileManager:{getActiveProfileId:()=>2},AuthManager:{isAuthenticated:true},
 isSyncBackoffActive:()=>false,createCollectionSyncContext:()=>ctx,
 recordCollectionSurfaceSuccess(){},registerSessionTeardownHandler(){},
 buildCollectionHomeKey:({id})=>'collection:'+id,
 HomeCatalogStore:{getForProfile:()=>organization,applyRemoteForProfile:(p,value)=>{organizationProfile=p;organization=value;}},
 SupabaseApi:{rpc:async(name,args)=>{requested=args.p_profile_id;return [{settings_json:{items:[
  {collection_id:'genres',is_collection:true,order:3},
  {collection_id:'franchises',is_collection:true,order:2},
  {collection_id:'discover',is_collection:true,order:1}
 ]}}]}},setTimeout,clearTimeout,console
});
assert.equal((await home.pullWithStatus(2)).status,'changed');
assert.equal(requested,1);assert.equal(organizationProfile,2);
assert.deepEqual(Array.from(organization.order),['collection:discover','collection:franchises','collection:genres'],
 'Franchises follows Discover using source organization, regardless of snapshot array order');
const auth={isAuthenticated:true,getSessionSignal:()=>session};const session={};
const contexts=vm.runInNewContext(source('js/core/sync/collectionSyncContext.js')+';({createCollectionSyncContext});',{
 ...policy,AuthManager:auth,ProfileManager:{getActiveProfileId:()=>2},
 SessionStore:{accessToken:'.'+Buffer.from(JSON.stringify({sub:'synthetic-account'})).toString('base64')+'.'},
 atob,LocalStore:{get:()=>({}),set(){}},registerSessionTeardownHandler(){}
});
const pending=contexts.createCollectionSyncContext('organization',2);assert(pending.isCurrent());
saved={collectionsSourceProfileId:2};assert.equal(pending.isCurrent(),false,'source change rejects old pending organization');
console.log('PASS explicit device-local shared collection source, independent default, destination isolation and read-only uploads.');
