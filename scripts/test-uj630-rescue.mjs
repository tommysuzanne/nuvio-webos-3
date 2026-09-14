import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
const root=path.resolve(process.argv[2]||'scripts/fixtures/uj630-rescue');
function strip(file){let s=fs.readFileSync(path.join(root,file),'utf8');const ast=parse(s,{ecmaVersion:'latest',sourceType:'module'});for(const n of ast.body.filter(n=>n.type==='ImportDeclaration').reverse())s=s.slice(0,n.start)+s.slice(n.end);return s.replace(/export /g,'')}
const data=new Map(),writes=[];
const c={Map,Set,Date,Math,JSON,String,Number,Array,Boolean,Error,console,
  navigator:{userAgent:'Web0S Chrome/38.0'},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
  createProfileScopedStore:()=>({getForProfile:()=>({order:[],disabled:[],customTitles:{}}),replaceForProfile:(...args)=>writes.push(args)}),
  AuthManager:{isAuthenticated:true},registerSessionTeardownHandler(){}};
vm.createContext(c);vm.runInContext(strip('js/platform/uj630Performance.js'),c);
assert(vm.runInContext('isUj630CollectionsReadOnly()',c));
for(const [file,name,action]of[
  ['js/data/local/collectionsStore.js','CollectionsStore','replaceForProfile(1, [], {silentSync:true})'],
  ['js/data/local/homeCatalogStore.js','HomeCatalogStore','setForProfile(1, {order:[]}, {silentSync:true})']]){
  const store=vm.runInNewContext(strip(file)+`;${name};`,{...c,
    assertUj630CollectionWriteAllowed:vm.runInContext('assertUj630CollectionWriteAllowed',c),
    isUj630CollectionsReadOnly:vm.runInContext('isUj630CollectionsReadOnly',c)});
  assert.throws(()=>vm.runInNewContext(`store.${action}`,{store}),e=>e.code==='COLLECTIONS_READ_ONLY');
}
for(const [file,name]of[['collectionSyncService.js','CollectionSyncService'],['homeCatalogSettingsSyncService.js','HomeCatalogSettingsSyncService']]){
  const service=vm.runInNewContext(strip('js/core/profile/'+file)+`;${name};`,{...c,
    isUj630CollectionsReadOnly:vm.runInContext('isUj630CollectionsReadOnly',c)});
  assert.equal(await service.push(1),false);service.triggerPush(1);assert.equal(service.pushTimers.size,0);
}
assert.equal(writes.length,0);
console.log('PASS rescue source: both stores refuse silent mutations, both services refuse immediate/deferred uploads, and no storage write or network call occurs.');
