import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {parse} from 'acorn';
const source=fs.readFileSync(new URL('../js/ui/navigation/router.js',import.meta.url),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const object=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.declarations?.some(v=>v.id.name==='Router')).declaration.declarations.find(v=>v.id.name==='Router').init;
const property=object.properties.find(p=>p.key.name==='reconcileUj630HistoryStack');
let legacy=true;const context={supportsUj630Performance:()=>legacy,NON_BACKSTACK_ROUTES:new Set(['profileSelection']),getStackEntryRoute:e=>e.route,getStackEntryParams:e=>e.params||{}};
const reconcile=vm.runInNewContext('({'+source.slice(property.start,property.end)+'}).reconcileUj630HistoryStack',context);
const router={stack:[],getRouteStateKey:(route,p)=>route==='folderDetail'?p.profile+'|'+p.folder:null};
for(let i=0;i<30;i++){
 router.stack.push({route:'home'},{route:'folderDetail',params:{profile:1,folder:'a'}});
 reconcile.call(router,'folderDetail',{profile:1,folder:'a'});assert.equal(router.stack.length,1);
 reconcile.call(router,'home');assert.equal(router.stack.length,0,'Completed visits must release route params');
}
router.stack=[{route:'home'},{route:'folderDetail',params:{profile:1,folder:'a'}},{route:'folderDetail',params:{profile:1,folder:'b'}}];
reconcile.call(router,'folderDetail',{profile:1,folder:'a'});assert.equal(router.stack.length,1,'History destination is matched by folder identity');
router.stack.push({route:'detail'});reconcile.call(router,'profileSelection');assert.equal(router.stack.length,0);
legacy=false;router.stack.push({route:'home'});reconcile.call(router,'home');assert.equal(router.stack.length,1);
console.log('PASS: 30 history returns release route params, folder identities match, profile reset and other platforms are preserved.');
const keyProp=object.properties.find(p=>p.key.name==='getRouteStateKey');let activeProfile='1';context.ProfileManager={getActiveProfileId:()=>activeProfile};context.String=String;context.console=console;
const stateKey=vm.runInNewContext('({'+source.slice(keyProp.start,keyProp.end)+'}).getRouteStateKey',context);
const views={routes:{home:{getRouteStateKey:()=> 'home'}}};legacy=true;
assert.equal(stateKey.call(views,'home'),'uj630:1:home');activeProfile='2';assert.equal(stateKey.call(views,'home'),'uj630:2:home');
assert.equal(stateKey.call(views,'home',{},'1'),'uj630:1:home','Outgoing view stays owned by its original profile');
legacy=false;assert.equal(stateKey.call(views,'home'),'home');
console.log('PASS: saved route state is isolated per profile, including a profile switch before outgoing capture.');
