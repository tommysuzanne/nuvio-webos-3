import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {parse} from 'acorn';
const source=fs.readFileSync('js/ui/screens/search/discoverScreen.js','utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
let object;for(const node of ast.body)for(const d of node.declaration?.declarations||[])if(d.init?.type==='ObjectExpression'&&d.init.properties.some(p=>p.key?.name==='reloadItems'))object=d.init;
const names=['reloadItems','updateRenderedDiscoverResults','renderDiscoverCards','loadNextPage'];
const methods=object.properties.filter(p=>names.includes(p.key?.name)).map(p=>source.slice(p.start,p.end)).join(',\n');
const shared=fs.readFileSync('js/ui/screens/search/uj630Results.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const classes={add(){},remove(){},contains(){return false}},listeners=new Set();
const grid={innerHTML:'old',classList:classes,addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)};
const container={classList:classes,querySelector:q=>q==='#discoverGridMount'?grid:null,querySelectorAll:()=>[],contains:()=>false};
let virtual=0,full=0,opened=0,resolveWatched;const watched=new Promise(r=>resolveWatched=r);
class View{constructor({main}){virtual++;this.main=main;main.innerHTML='view';}setRows(rows){this.rows=rows;}capture(){return {scope:'a:1'}}destroy(){} }
const ctx={metadataContextRevision:()=>0,resolveUj630Catalog:x=>x,renderUjCard:()=>"",AbortController,Map,Array,String,Number,Boolean,Set,uj630NavigationScope:()=> 'a:1',document:{activeElement:null},Uj630CatalogLoader:class{dispose(){}},Uj630BrowseWindow:View,Uj630Images:{releaseTree(){}},Router:{getCurrent:()=> 'discover'},isUj630CollectionsEnabled:()=>true,catalogRepository:{getCatalog:async()=>({status:'success',data:{items:[{id:'new-1'},{id:'new-2'}],nextSkip:100,hasMore:false}})}};
const api=vm.runInNewContext(shared+';({'+methods+',clearUj630Results});',ctx);
const screen={...api,container,items:[{id:'old'}],getSelectedCatalog:()=>({}),captureViewState(){},refreshWatchedTitleIds:()=>watched,requestRender:()=>full++,openDetailFromNode:()=>opened++};
for(let i=0;i<4;i++){
 await screen.reloadItems({suppressLoadingRender:true,preserveExistingItems:true,partialRender:true});
 assert.equal(grid.innerHTML,'view');assert.equal(screen.ujResults.rows[0].items[0].id,'new-1');assert.equal(full,0,'grid does not need the watched-list render to recover');assert.equal(listeners.size,1);
}
for(const fn of listeners)fn({target:{closest:()=>({dataset:{}})}});assert.equal(opened,1,'one click after four reloads');
api.clearUj630Results(screen);assert.equal(listeners.size,0);resolveWatched();await new Promise(setImmediate);assert.equal(full,1,'only current watched response can request rendering');assert.equal(virtual,1);
console.log('PASS actual Discover reload and UJ view: immediate filtered grid, no second-render dependency, one delegated click and cleanup after repeated mounts.');

// The same query keeps its mounted cards while the new request is pending.
await screen.reloadItems({partialRender:true});const previous=screen.ujResults;let finish;
ctx.catalogRepository.getCatalog=()=>new Promise(resolve=>finish=resolve);
const pending=screen.reloadItems({preserveExistingItems:true,partialRender:true});
assert.equal(screen.ujResults,previous);assert.equal(screen.items[0].id,'new-1');
finish({status:'success',data:{items:[{id:'updated'}],hasMore:false}});await pending;
assert.equal(screen.ujResults,previous);assert.equal(screen.ujResults.rows[0].items[0].id,'updated');
screen.selectedGenre='Comedy';const changed=screen.reloadItems({preserveExistingItems:true,partialRender:true});
assert.equal(screen.ujResults,null);assert.equal(screen.items.length,0,'unrelated results are not shown under a new genre');
finish({status:'success',data:{items:[{id:'comedy'}],hasMore:false}});await changed;
api.clearUj630Results(screen);assert.equal(listeners.size,0);
console.log('PASS pertinent Discover view kept during refresh, replaced in place, and cleared on changed criteria.');
