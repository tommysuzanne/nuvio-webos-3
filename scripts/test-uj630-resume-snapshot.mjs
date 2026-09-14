import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {parse} from 'acorn';
const source=fs.readFileSync('js/ui/screens/home/homeScreen.js','utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const names=['readContinueWatchingDisplaySnapshot','writeContinueWatchingDisplaySnapshot'];
const code=ast.body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
let scope='a:1';const data={};const api=vm.runInNewContext(code+';({read:readContinueWatchingDisplaySnapshot,write:writeContinueWatchingDisplaySnapshot});',{
 String,Date,Array,Object,Boolean,CW_DISPLAY_SNAPSHOT_KEY:'snapshot',CW_DISPLAY_SNAPSHOT_MAX_ITEMS:40,CW_DISPLAY_SNAPSHOT_MAX_SCOPES:4,CW_DISPLAY_SNAPSHOT_MAX_AGE_MS:86400000,
 LocalStore:{get:(k,d)=>data[k]||d,set:(k,v)=>data[k]=v},isUj630CollectionsEnabled:()=>true,uj630NavigationScope:()=>scope,LayoutPreferences:{get:()=>({})},refreshContinueWatchingReleaseState:x=>x,shouldKeepNextUpForAiringSetting:()=>true,isCloudContinueWatchingItem:()=>false});
api.write('1:nuvio',[{contentId:'one'}]);assert.equal(api.read('1:nuvio')[0].contentId,'one');scope='b:1';assert.equal(api.read('1:nuvio').length,0);api.write('1:nuvio',[{contentId:'two'}]);scope='a:1';assert.equal(api.read('1:nuvio')[0].contentId,'one');
api.write('1:nuvio',[]);assert.equal(api.read('1:nuvio').length,0,'completed/removed rows persist as empty instead of resurrecting an old snapshot');
console.log('PASS actual resume snapshot functions: account isolation and persistent empty result after completion/removal.');
