import {evidenceDir,mediaBaseUrl} from './client.mjs';
import fs from 'node:fs';import {connect,pause} from './client.mjs';
const tv=await connect();const route="window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router";const checks=[];
try{
console.log('navigation: start');
checks.push(await tv.eval(`({test:'environment',build:window.__NUVIO_ENV__&&window.__NUVIO_ENV__.NUVIO_BUILD_LABEL})`));
if(await tv.eval(`${route}.current`)!=='home')throw Error('Home required');
checks.push(await tv.eval(`(function(){var h=${route}.routes.home,v=h.ujBrowse;return {test:'home-only',kinds:v.rows.map(function(r){return r.kind}),collections:v.rows.filter(function(r){return r.kind==='collection'}).length,folders:v.rows.filter(function(r){return r.kind==='collection'}).reduce(function(n,r){return n+r.items.length},0),allRectangular:Array.from(document.querySelectorAll('#home .is-landscape')).every(function(n){return n.offsetWidth>n.offsetHeight})};})()`));
await tv.eval(`(function(){var h=${route}.routes.home,v=h.ujBrowse;if(h.sidebarExpanded)v.closeMenu();v.focus={row:v.rows.findIndex(function(r){return r.kind==='collection'}),col:2};v.focusCurrent();window.__ujNavBefore=v.capture();return true})()`);
console.log('navigation: home checked');await tv.key(461);await pause(250);
checks.push(await tv.eval(`({test:'back-opens-menu',open:${route}.routes.home.sidebarExpanded})`));await tv.key(39);
checks.push(await tv.eval(`(function(){var h=${route}.routes.home;return {test:'right-restores-card',open:h.sidebarExpanded,same:h.ujBrowse.capture().itemId===window.__ujNavBefore.itemId};})()`));
console.log('navigation: menu checked');await tv.eval(`(function(){var h=${route}.routes.home,v=h.ujBrowse;window.__ujOriginalRows=v.rows;var seed=v.rows.filter(function(r){return r.kind==='collection'})[0].items[0];var large=Array.from({length:1000},function(_,i){return Object.assign({},seed,{id:'synthetic-'+i,folderId:'synthetic-'+i,title:'Test '+i})});v.setRows([{key:'synthetic',title:'Test temporaire',kind:'collection',items:large}]);v.focus={row:0,col:998};v.focusCurrent();return true})()`);await tv.key(39);
checks.push(await tv.eval(`(function(){var v=${route}.routes.home.ujBrowse;return {test:'1000-cards',last:v.focus.col===999,mounted:document.querySelectorAll('#home .uj-card').length,selected:!!v.currentNode};})()`));
console.log('navigation: synthetic checked');await tv.eval(`(function(){var v=${route}.routes.home.ujBrowse;v.scrolls.clear();v.scrollY=0;v.main.scrollTop=0;v.setRows(window.__ujOriginalRows,window.__ujNavBefore);delete window.__ujOriginalRows;return true})()`);await pause(5000);
await tv.eval(`(function(){var p={mutations:0,images:0},root=document.getElementById('home');window.__ujIdle=p;p.observer=new MutationObserver(function(records){records.forEach(function(r){if(r.type==='attributes'&&r.attributeName==='src')p.images++;p.mutations++})});p.observer.observe(root,{subtree:true,childList:true,attributes:true});return true})()`);await pause(5000);
checks.push(await tv.eval(`(function(){var p=window.__ujIdle;p.observer.disconnect();return {test:'idle-5s',mutations:p.mutations,imageAssignments:p.images};})()`));
fs.writeFileSync(evidenceDir+'navigation-functional.json',JSON.stringify(checks,null,2));console.log(checks);
}finally{fs.writeFileSync(evidenceDir+'navigation-functional-partial.json',JSON.stringify(checks,null,2));tv.close()}
