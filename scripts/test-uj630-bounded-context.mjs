import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {BoundedCache} from '../js/core/cache/boundedCache.js';
import {UJ630_BUDGETS} from '../js/platform/uj630Budgets.js';
import {invalidateMetadataContext,onMetadataContextChanged,metadataContextRevision} from '../js/core/cache/cacheContext.js';
const source=fs.readFileSync('js/core/cache/uj630Caches.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const banks=vm.runInNewContext(source+';({createUj630Cache,uj630CacheStats});',{Map,Array,BoundedCache,UJ630_BUDGETS,onMetadataContextChanged,supportsUj630Performance:()=>true});
const a=banks.createUj630Cache('metadata','full'),b=banks.createUj630Cache('metadata','enriched');
for(let i=0;i<1500;i++){a.set('film'+i,{id:i,overview:'x'.repeat(2000)});b.set('episode'+i,{id:i,videos:[{title:'Episode'}]})}
let stats=banks.uj630CacheStats().metadata;assert.equal(stats.entries,128);assert(stats.bytesEstimate<=8*1024*1024);assert.equal(a.get('film0'),undefined);
assert(a.get('film1499'));a.set('film1499',{overview:'x'.repeat(5*1024*1024)});assert.equal(a.get('film1499'),undefined,'oversize replacement does not leave stale older data');
const auxiliaries=['header','rail','browse','related'].map(n=>banks.createUj630Cache('tmdb',n));
for(let i=0;i<1500;i++)auxiliaries[i%4].set('item'+i,{id:i});assert.equal(banks.uj630CacheStats().tmdb.entries,256);
for(const key of ['activeProfileId','tmdbSettings','installedAddonUrls','addonManifestRevision','nuvioServerConfigurationV1','access_token']){
 a.set('context',{key});const before=metadataContextRevision();invalidateMetadataContext(key);assert.equal(metadataContextRevision(),before+1);assert.equal(a.size,0);assert.equal(b.size,0);
}
let now=0;const pages=new BoundedCache({...UJ630_BUDGETS.summaries,now:()=>now,weight:v=>v.items.length});
for(let i=0;i<50;i++)pages.set(i,{items:Array.from({length:32},(_,id)=>({id:i*32+id}))});assert(pages.stats().weight<=1000);assert(pages.stats().bytesEstimate<=4*1024*1024);
now=300001;assert.equal(pages.get(49),undefined);assert.equal([...pages.entries()].length,0);
const ttl=new BoundedCache({maxEntries:2,maxBytes:1000,ttlMs:100,now:()=>now});ttl.set('a',{id:'a'});ttl.set('b',{id:'b'});ttl.get('a');ttl.set('c',{id:'c'});assert.equal(ttl.get('b'),undefined);assert(ttl.get('a'));
console.log('PASS shared full/enriched 128-entry budget after 1500 titles, auxiliary 256 budget, bytes/TTL/LRU/oversized entries, profile/language/addon/server/session invalidation, 1000 summaries.');
