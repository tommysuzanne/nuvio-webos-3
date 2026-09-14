import { uj630FolderSourceKey, mergeUj630FolderLists, makeUj630FolderRows } from "../js/ui/screens/collection/uj630FolderRows.js";
import { UJ630_BUDGETS } from "../js/platform/uj630Budgets.js";
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../js/ui/screens/collection/uj630Folder.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
let profile='1',route='folderDetail',addonOptions,requests=[],maxActive=0,active=0;
const node=()=>({classList:{add(){},remove(){},toggle(){}},innerHTML:'',textContent:'',focus(){}});
const back=node(),main=node(),status=node(),tabGroup=node(),tabs=[];
Object.defineProperty(tabGroup,'innerHTML',{set(value){tabs.length=0;for(const match of value.matchAll(/data-uj-tab="(-?\d+)"/g)){const tab=node();tab.dataset={ujTab:match[1]};tabs.push(tab)}}});
const container={...node(),querySelector:q=>q==='main'?main:q==='.uj-folder-back'?back:q==='.uj-folder-status'?status:q==='.uj-folder-tabs'?tabGroup:tabs.find(t=>q.includes('"'+t.dataset.ujTab+'"'))||null,querySelectorAll:q=>q==='[data-uj-tab]'?tabs:[]};
const screen={container,ensureDelegatedEventsBound(){}};
class View {constructor(){this.main=main;this.focus={row:0,col:0};this.scrolls=new Map();this.rows=[]}setRows(rows,saved){this.rows=rows;if(saved)this.focus={row:saved.row,col:saved.col}}ownsFocus(){return true}focusCurrent(){}capture(){return {...this.focus}}destroy(){}}
const collection={id:'c',showAllTab:true,folders:[{id:'f',sources:[0,1,2].map(i=>({provider:'addon',id:i}))}]};
const cache=new Map();const ctx={uj630FolderSourceKey,mergeUj630FolderLists,makeUj630FolderRows,uj630NavigationScope:()=>String(profile),metadataContextRevision:()=>0,UJ630_BUDGETS,Map,Set,Array,Number,String,Boolean,Math,Promise,Date,AbortController,setTimeout,clearTimeout,console,forEachUj630Slice:async(items,fn,current)=>{items.forEach(fn);return current()},deferUj630Work:()=>false,Uj630SummaryCache:{set:(k,v)=>cache.set(k,v),get:k=>cache.get(k)},CollectionsStore:{getFolderContext:()=>({collection,folder:collection.folders[0]})},uj630DisplayText:x=>String(x??""),ProfileManager:{getActiveProfileId:()=>profile},addonRepository:{getInstalledAddons:async options=>{addonOptions=options;return[]}},Uj630BrowseWindow:View,renderUjCard(){},Uj630Images:{releaseTree(){}},Router:{getCurrent:()=>route,back(){}},ScreenUtils:{show(){},hide(){}},focusWithoutScroll(){},document:{getElementById:()=>container}};
const api=vm.runInNewContext(source+';({mount:mountUj630Folder,cleanup:cleanupUj630Folder});',ctx);
const helpers={buildFolderSourceKey:s=>String(s.id),buildAddonTabLabel:s=>'Source '+s.id,roundRobinMerge:lists=>lists.flat(),fetchSourceItems(source,page,skip,signal){active++;maxActive=Math.max(maxActive,active);return new Promise((resolve,reject)=>{let ended=false;const finish=(value,error)=>{if(ended)return;ended=true;active--;error?reject(error):resolve(value)};const req={source:source.id,signal,resolve:value=>finish(value)};requests.push(req);signal.addEventListener('abort',()=>finish(null,new Error('aborted')));});}};
const flush=async()=>{await new Promise(setImmediate)};
await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);
assert.equal(addonOptions.cacheOnly,true,'Opening a folder cannot start unrelated manifest downloads');assert.equal(requests.length,2);assert.equal(maxActive,2);
tabs.find(t=>t.dataset.ujTab==='1').onclick();await flush();assert(requests[0].signal.aborted&&requests[1].signal.aborted);assert.equal(requests.at(-1).source,1,'Only newly selected source loads');assert.equal(maxActive,2);
requests.at(-1).resolve({items:[{id:'new',type:'movie',title:'New'}],page:1,hasMore:false});await flush();assert.equal(screen.ujBrowse.rows[0].items[0].id,'movie:new');
screen.ujBrowse.focus={row:0,col:0};api.cleanup(screen);await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);assert.equal(screen.ujFolder.selected,1,'Selected tab survives forward re-entry');assert.equal(screen.ujBrowse.rows[0].items[0].id,'movie:new');api.cleanup(screen);
profile='2';await api.mount(screen,{collectionId:'c',folderId:'f'},{},helpers);assert.equal(screen.ujFolder.selected,-1,'Another profile keeps independent tab state');const before=screen.ujBrowse.rows.length;profile='3';requests.at(-1).resolve({items:[{id:'wrong-profile'}],hasMore:false});await flush();assert.equal(screen.ujBrowse.rows.length,before,'Late profile response cannot repaint');api.cleanup(screen);
console.log('PASS: folder cache-first labels, two-source limit, real abort on tab change, late profile rejection and per-profile tab restoration.');

const folderSource=fs.readFileSync(new URL('../js/ui/screens/collection/folderDetailScreen.js',import.meta.url),'utf8');
const keySource=folderSource.slice(folderSource.indexOf('function stableSourceValue('),folderSource.indexOf('\n}',folderSource.indexOf('function buildFolderSourceKey('))+2);
const keyApi=vm.runInNewContext(keySource+';({key:buildFolderSourceKey,stable:stableSourceValue});',{JSON,Array,Object,String});
for(let i=0;i<60;i++){const input={provider:i%2?'tmdb':'addon',addonId:'a',catalogId:'c',type:'movie',tmdbId:i,filters:{z:i,a:{y:2,x:1}},title:'Source '+i};const sig={provider:input.provider,index:i,addonId:'a',catalogId:'c',type:'movie',genre:'',tmdbSourceType:'',tmdbId:i,mediaType:'',title:input.title,sortBy:'',filters:keyApi.stable(input.filters)};assert.equal(keyApi.key(input,i),input.provider+':'+i+':'+JSON.stringify(keyApi.stable(sig)))}
console.log('PASS source identity keys remain byte-identical without repeated fixed-schema sorting.');
