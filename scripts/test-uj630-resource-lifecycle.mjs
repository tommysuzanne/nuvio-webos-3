import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from 'acorn';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function strip(file) {
 let text=fs.readFileSync(file,'utf8'); const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
 for(const node of ast.body.filter(n=>n.type==='ImportDeclaration').reverse())text=text.slice(0,node.start)+text.slice(node.end);
 return text.replace(/export /g,'');
}
function methods(file, exported, names, context) {
 const text=fs.readFileSync(file,'utf8'),ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
 const object=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.declarations?.some(d=>d.id.name===exported)).declaration.declarations.find(d=>d.id.name===exported).init;
 return vm.runInNewContext('({'+object.properties.filter(p=>names.includes(p.key.name)).map(p=>text.slice(p.start,p.end)).join(',')+'})',context);
}
let invalidate;
const cacheContext={Map,Set,Date,JSON,String,Object,Array,Infinity,stringifyStoredData:JSON.stringify};
const Cache=vm.runInNewContext(strip('js/core/cache/boundedCache.js')+';BoundedCache',cacheContext);
const budgets=vm.runInNewContext(strip('js/platform/uj630Budgets.js')+';UJ630_BUDGETS',{});
const content=new Cache(budgets.metadata);
const routes=vm.runInNewContext(strip('js/ui/navigation/routeStateStore.js')+';RouteStateStore',{
 ...cacheContext,BoundedCache:Cache,UJ630_BUDGETS:budgets,supportsUj630Performance:()=>true,
 createUj630Cache:()=>content,onMetadataContextChanged:fn=>invalidate=fn
});
for(let i=0;i<1500;i++)routes.set('p1:detail:'+i,{params:{itemId:i},meta:{description:'x'.repeat(12000)},episodes:Array.from({length:20},(_,n)=>({id:n})),pendingFocusRestore:{id:'poster'},contentScrollTop:700});
assert.equal(routes.get('p1:detail:0'),null,'old navigation snapshots are evicted');
assert(content.stats().entries<=128);assert(content.stats().bytesEstimate<=8*1024*1024);
content.clear();const light=routes.get('p1:detail:1499');assert.equal(light.contentScrollTop,700);assert.equal(light.meta,undefined,'network eviction preserves navigation only');
invalidate('activeProfileId');assert.equal(routes.get('p1:detail:1499').contentScrollTop,700);
invalidate();assert.equal(routes.get('p1:detail:1499'),null,'profile/language/session invalidation drops snapshots');
// Browser state objects must not keep a detached library root alive after cleanup.
let released=0,cancelled=0;
const library=methods('js/ui/screens/library/libraryScreen.js','LibraryScreen',['cleanup','ensureGridGeometry','buildGridRows','resolveRelativeGridNode'],{
 resetDpadRepeat:()=>{},cancelAnimationFrame:()=>cancelled++,clearTimeout:()=>{},Uj630Images:{releaseTree:()=>released++},ScreenUtils:{hide:()=>{}},Array,
 groupNodesByRow:cards=>[{nodes:cards}],findNearestNodeByCenterX:(_n,nodes)=>nodes[0]
});
const card={matches:()=>true,getBoundingClientRect:()=>({left:0,width:100})},last={};
const grid={clientWidth:800}; Object.assign(library,{container:{querySelector:()=>grid,querySelectorAll:()=>[card,last]},gridRows:[{nodes:[card]}],gridWidth:700});
assert.equal(library.resolveRelativeGridNode(card,'right'),last,'changed width recalculates cached rows before navigation');
Object.assign(library,{lastMainFocus:{detachedRoot:true},imageFrame:1,cancelScheduledRender(){},clearClosingPicker(){},cancelPendingPosterHold(){},controller:{dispose(){}}});
library.cleanup();assert.equal(library.lastMainFocus,null);assert.equal(released,1);assert.equal(cancelled,1);assert.equal(library.controller,null);
// A proxy which is not ready on the first frame must still find visible posters
// via data-uj-managed; offscreen posters must not join its global ready callback.
let nearMarked=false, farMarked=true, enqueued=0;
const image=near=>({setAttribute(){if(near)nearMarked=true;else farMarked=true;},removeAttribute(){if(near)nearMarked=false;else farMarked=false;}});
const near={getBoundingClientRect:()=>({top:100,bottom:400,height:300}),querySelectorAll:()=>[image(true)]};
const far={getBoundingClientRect:()=>({top:3000,bottom:3300,height:300}),querySelectorAll:()=>[image(false)]};
const windowView=methods('js/ui/screens/library/libraryScreen.js','LibraryScreen',['updateImageWindow'],{
 supportsUj630Performance:()=>true,document:{hidden:false},Uj630Images:{enqueueTree(){enqueued++;},releaseTree(){}}
});
Object.assign(windowView,{ensureGridGeometry(){},container:{querySelector:()=>({getBoundingClientRect:()=>({top:0,bottom:1080})})},gridRows:[{nodes:[near]},{nodes:[far]}]});
windowView.updateImageWindow();assert(nearMarked);assert(!farMarked);assert.equal(enqueued,1);
// Private assets: byte cap, selected IDs only, revocation, abort, and dimension failure.
let created=0;const revoked=[];
const mounted=[{src:'blob:1'},{src:'https://example.test/other.png'}].map(item=>({...item,getAttribute(){return this.src;},removeAttribute(){this.src=null;}}));
class ImageStub {
 naturalWidth=128;naturalHeight=128;
 set src(value){this.value=value;queueMicrotask(()=>this.onload?.());}
 removeAttribute(){}
}
const pool=vm.runInNewContext(strip('js/core/media/uj630MemberAssets.js')+';Uj630MemberAssets',{
 Map,Set,Date,Promise,Error,AbortController,Image:ImageStub,setTimeout,clearTimeout,readStaticImagePixels:async()=>128*128,
 URL:{createObjectURL:()=> 'blob:'+ ++created,revokeObjectURL:url=>revoked.push(url)},UJ630_BUDGETS:budgets,
 document:{querySelectorAll:()=>mounted},
 withUj630Read:(task,{signal})=>task(signal)
});
for(let i=0;i<34;i++)await pool.load('avatar:'+i,async()=>({size:2*1024*1024,type:'image/png'}));
assert(pool.stats().bytes<=8*1024*1024);assert(pool.stats().entries<=4);assert(revoked.length>=30);
assert.equal(mounted[0].src,null,'eviction also drops mounted decoded image references');
assert.equal(mounted[1].src,'https://example.test/other.png','unrelated artwork remains visible');
const before=created;assert.equal(await pool.load('too-large',async()=>({size:5*1024*1024,type:'image/png'})),null);assert.equal(created,before);
let aborted=false;
const slow=pool.load('slow',signal=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));});}));
pool.clear();await slow;assert(aborted);assert.equal(pool.stats().bytes,0);assert.equal(pool.stats().entries,0);assert.equal(pool.stats().pending,0);
// Catalog metadata must not implicitly hydrate 34 member assets on legacy TV.
let assetReads=0;
const avatar=vm.runInNewContext(strip('js/data/remote/supabase/avatarRepository.js')+';AvatarRepository',{
 Map,Set,Date,Promise,String,Number,Boolean,Array,console,supportsUj630Performance:()=>true,Uj630MemberAssets:pool,
 MemberCatalogStorage:{loadAvatarCatalog:()=>({standardLoaded:true,standardItems:[],memberLoaded:true,memberItems:Array.from({length:34},(_,i)=>({id:String(i),storagePath:'fixture'}))}),loadAsset:async()=>{assetReads++;return {size:1024,type:'image/png'}},saveAvatarCatalog(){}},
 SupabaseApi:{rpc:async()=>[]},ServerConfigurationStore:{getActive:()=>({backendUrl:'https://example.test'})},revokeStorageAssetUrl(){},createStorageAssetUrl(){}
});
const avatars=await avatar.getAvatarCatalog(true);assert.equal(avatars.length,34);assert.equal(assetReads,0,'catalog loading reads no avatar blobs');
// Background catalog loading requests only the selected background, never the others.
let backgroundReads=0;
const backgrounds=vm.runInNewContext(strip('js/data/remote/supabase/profileBackgroundRepository.js')+';ProfileBackgroundRepository',{
 Map,Set,Date,Promise,String,Number,Boolean,Array,console,supportsUj630Performance:()=>true,Uj630MemberAssets:pool,
 MemberCatalogStorage:{loadProfileBackgroundCatalog:()=>({items:Array.from({length:8},(_,i)=>({id:String(i),storagePath:'fixture'}))}),loadAsset:async()=>{backgroundReads++;return {size:1024,type:'image/png'}},saveProfileBackgroundCatalog(){}},
 SupabaseApi:{rpc:()=>new Promise(()=>{})},revokeStorageAssetUrl(){},createStorageAssetUrl(){}
});
// ensureLoaded serves cached catalog, while the intentional unresolved refresh stays in the background.
await backgrounds.ensureLoaded();backgrounds.loadSelectedAndPreload('3');await new Promise(resolve=>setTimeout(resolve,10));assert.equal(backgroundReads,1);
pool.clear();
// One global retained-byte budget covers text windows, bitmap windows and metadata.
const budget=require('../services/webos/src/subtitleCacheBudget.js'),a=new Map(),b=new Map();
for(let i=0;i<32;i++)budget.set(i%2?a:b,'window:'+i,{body:'x'.repeat(512*1024)},10000,32);
assert(budget.stats().bytes<=8*1024*1024);assert(a.size+b.size<32);
assert.equal(budget.set(a,'oversized',{body:'x'.repeat(3*1024*1024)},10000,32),false);
budget.clear();assert.equal(a.size+b.size,0);
budget.set(a,'expires',{body:'short'},10,32);await new Promise(resolve=>setTimeout(resolve,25));assert.equal(a.size,0,'idle expiry releases values without another lookup');
const subtitles=require('../services/webos/src/bitmapSubtitles.js');
const owned=subtitles.beginOwnedRead('test-read');let destroyed=0;owned.requests.add({destroy(){destroyed++;}});
assert(subtitles.cancelOwnedRead('test-read'));assert.equal(destroyed,1);assert(owned.cancelled);assert(!subtitles.cancelOwnedRead('test-read'));
subtitles.clearBitmapSubtitleCaches();
// The legacy HTTP request shape and cancellation also settle the actual range promise.
const http=require('node:http'), {EventEmitter}=require('node:events');
const originalRequest=http.request; let activeRequest;
http.request=(options, callback)=>{
 assert.equal(typeof callback,'function'); assert.equal(options.hostname,'example.test');
 const req=activeRequest=new EventEmitter(); req.setTimeout=()=>{}; req.end=()=>{};
 req.destroy=()=>{req.emit('close');}; return req;
};
try {
 const owner=subtitles.beginOwnedRead('range-cancel');
 const range=subtitles._test.requestRange('http://example.test/file',0,100,101,0,owner).catch(error=>error);
 subtitles.cancelOwnedRead('range-cancel'); assert.equal((await range).code,'REQUEST_SUPERSEDED'); assert.equal(owner.requests.size,0);
} finally {http.request=originalRequest;}
const pixels=vm.runInNewContext(strip('js/core/media/staticImageHeader.js')+';staticImagePixels',{Uint8Array,String});
const png=new Uint8Array(45);png.set([137,80,78,71],0);png.set([0,0,0,13,73,72,68,82],8);png[19]=128;png[23]=128;
assert.equal(pixels(png,'image/png'),16384);png.set([0,0,0,0,97,99,84,76],33);assert.equal(pixels(png,'image/png'),0,'APNG rejected before decoding');
console.log('PASS resource lifecycle: bounded route payloads, independent focus state, library cleanup/geometry, selective profile assets, bytes/revocation/abort, global subtitle cache and idle expiry.');
