import { uj630FolderSourceKey, mergeUj630FolderLists, makeUj630FolderRows } from "../js/ui/screens/collection/uj630FolderRows.js";
import { UJ630_BUDGETS } from "../js/platform/uj630Budgets.js";
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('js/ui/screens/collection/uj630Folder.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let clock=1000000;let profile='1',route='folderDetail',addonOptions,requests=[],maxActive=0,active=0;
const node=()=>({classList:{add(){},remove(){},toggle(){}},innerHTML:'',textContent:'',focus(){}});
const back=node(),main=node(),status=node(),tabGroup=node(),tabs=[];
Object.defineProperty(tabGroup,'innerHTML',{set(value){tabs.length=0;for(const match of value.matchAll(/data-uj-tab="(-?\d+)"/g)){const tab=node();tab.dataset={ujTab:match[1]};tabs.push(tab)}}});
const container={...node(),querySelector:q=>q==='main'?main:q==='.uj-folder-back'?back:q==='.uj-folder-status'?status:q==='.uj-folder-tabs'?tabGroup:tabs.find(t=>q.includes('"'+t.dataset.ujTab+'"'))||null,querySelectorAll:q=>q==='[data-uj-tab]'?tabs:[]};
const screen={container,ensureDelegatedEventsBound(){}};
class View {constructor(options){this.options=options;this.main=main;this.focus={row:0,col:0};this.scrolls=new Map();this.rows=[]}setRows(rows,saved){this.rows=rows;if(saved)this.focus={row:saved.row,col:saved.col}}ownsFocus(){return true}focusCurrent(){}capture(){return {...this.focus}}destroy(){}}
const collection={id:'c',showAllTab:false,folders:[{id:'f',sources:[0].map(i=>({provider:'addon',id:i}))}]};
const cache=new Map();const ctx={uj630FolderSourceKey,mergeUj630FolderLists,makeUj630FolderRows,uj630NavigationScope:()=>String(profile),metadataContextRevision:()=>0,UJ630_BUDGETS,forEachUj630Slice:async(items,fn,current)=>{items.forEach(fn);return current()},Map,Set,Array,Number,String,Boolean,Math,Promise,Date:{now:()=>clock},AbortController,setTimeout,clearTimeout,console,deferUj630Work:()=>false,Uj630SummaryCache:{set:(k,v)=>cache.set(k,v),get:k=>cache.get(k)},CollectionsStore:{getFolderContext:()=>({collection,folder:collection.folders[0]})},uj630DisplayText:x=>String(x??""),ProfileManager:{getActiveProfileId:()=>profile},addonRepository:{getInstalledAddons:async options=>{addonOptions=options;return[]}},Uj630BrowseWindow:View,renderUjCard(){},Uj630Images:{releaseTree(){}},Router:{getCurrent:()=>route,back(){}},ScreenUtils:{show(){},hide(){}},focusWithoutScroll(){},document:{getElementById:()=>container}};
const api=vm.runInNewContext(source+';({mount:mountUj630Folder,cleanup:cleanupUj630Folder});',ctx);
const helpers={buildFolderSourceKey:s=>String(s.id),buildAddonTabLabel:s=>'Source '+s.id,roundRobinMerge:lists=>lists.flat(),fetchSourceItems(source,page,skip,signal){active++;maxActive=Math.max(maxActive,active);return new Promise((resolve,reject)=>{let ended=false;const finish=(value,error)=>{if(ended)return;ended=true;active--;error?reject(error):resolve(value)};const req={source:source.id,signal,resolve:value=>finish(value)};requests.push(req);signal.addEventListener('abort',()=>finish(null,new Error('aborted')));});}};
const flush=async()=>{await new Promise(setImmediate)};


const items=Array.from({length:100},(_,i)=>({id:'title'+i,type:'movie',title:'Movie '+i}));
await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);
requests.at(-1).resolve({items,page:1,hasMore:false,nextSkip:100});await flush();
for(const index of [32,64,96]){
 const item=screen.ujBrowse.rows.flatMap(row=>row.items)[index];
 screen.ujBrowse.options.onNeedItem(item);await flush();
 assert.equal(screen.ujBrowse.options.resolveItem(item).id,'title'+index);
}
assert.equal(requests.length,1,'one provider response of 100 titles is downloaded once');assert.equal(cache.size,4);
const last=screen.ujBrowse.rows.flatMap(row=>row.items)[96];cache.clear();
screen.ujBrowse.options.onNeedItem(last);assert.equal(requests.length,2);
requests.at(-1).resolve({items,page:1,hasMore:false,nextSkip:100});await flush();
assert.equal(screen.ujBrowse.options.resolveItem(last).id,'title96','evicted page reloaded using original cursor');
api.cleanup(screen);await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);await flush();
assert.equal(requests.length,2,'fresh ended folder reuses pages');api.cleanup(screen);
clock+=UJ630_BUDGETS.summaries.ttlMs+1;
await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);await flush();assert.equal(requests.length,3,'expired ended folder refreshes its first page');
requests.at(-1).resolve({items:[...items,{id:'new',type:'movie'}],page:1,hasMore:false,nextSkip:101});await flush();
assert.equal(screen.ujBrowse.rows.flatMap(r=>r.items).length,101);api.cleanup(screen);
// Selected source follows its identity when another device reorders sources.
collection.folders[0].sources.unshift({provider:'addon',id:99});
await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);await flush();
assert.equal(screen.ujFolder.tabs[screen.ujFolder.selected].source.id,0);api.cleanup(screen);
// Isolated large provider response remains fully navigable (memory bound tested separately).
collection.folders[0].id='large';collection.folders[0].sources=[{provider:'addon',id:2}];
await api.mount(screen,{collectionId:'c',folderId:'large'},{},helpers);
const large=Array.from({length:10000},(_,i)=>({id:'large'+i,type:'movie'}));
requests.at(-1).resolve({items:large,page:1,hasMore:false,nextSkip:10000});await flush();
const logical=screen.ujBrowse.rows.flatMap(r=>r.items);assert.equal(logical.length,10000);assert.equal(logical.at(-1).ujIndex,9999);
api.cleanup(screen);assert.equal(active,0);
console.log('PASS actual folder: 100-item response once, eviction reload, expired ended folder refresh, tab identity after reorder, logical access to 10000 titles; no account mutation.');
// Evict all network topology while retaining a deep navigation position.
collection.folders[0].id='restore';
await api.mount(screen,{collectionId:'c',folderId:'restore'},{},helpers);
requests.at(-1).resolve({items:large.slice(0,200),page:1,hasMore:false,nextSkip:200});await flush();
screen.ujBrowse.focus={row:20,col:3};api.cleanup(screen);cache.clear();
const countBefore=requests.length;
await api.mount(screen,{collectionId:'c',folderId:'restore'},{},helpers);
requests.at(-1).resolve({items:large.slice(0,100),page:1,hasMore:true,nextSkip:100});await flush();
assert.equal(requests.length,countBefore+2,'restore follows provider pagination to reach the evicted saved position');
assert(screen.ujFolder.restore,'saved position is not consumed by the first partial page');
requests.at(-1).resolve({items:large.slice(100,200),page:2,hasMore:false,nextSkip:200});await flush();
assert.equal(screen.ujBrowse.focus.row,20);assert.equal(screen.ujBrowse.focus.col,3);assert.equal(screen.ujFolder.restore,null);
api.cleanup(screen);assert.equal(active,0);
console.log('PASS deep navigation position survives topology eviction and is restored after original provider pages arrive.');
