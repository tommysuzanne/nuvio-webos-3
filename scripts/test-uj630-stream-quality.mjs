import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {is4kStream,prioritize4kStreams} from '../js/core/streams/streamQualityOrdering.js';
for (const item of [{quality:'4K'},{qualityValue:2160},{title:'Film.2160P.WEB-DL'},
  {name:'Torrentio\n4k'},{description:'UHD HDR10'},{behaviorHints:{filename:'Film.3840x2160.mkv'}},
  {title:'𝗙𝗶𝗹𝗺 𝟰𝗞'}]) assert.equal(is4kStream(item),true,JSON.stringify(item));
for (const item of [{},{title:'Film 1080p'},{title:'21600 kbps'},
  {title:'x4kencode'},{url:'https://example.test/4k/token'},
  {quality:'720p',title:'A 4K title'}]) assert.equal(is4kStream(item),false,JSON.stringify(item));
const items=[{id:'a',title:'1080p'},{id:'b',title:'2160p'},{id:'c'},{id:'d',title:'4K'},
  {id:'e',title:'720p'},{id:'f',title:'UHD'}];
const before=JSON.stringify(items),result=prioritize4kStreams(items);
assert.deepEqual(result.map(x=>x.id),['b','d','f','a','c','e']);
assert.equal(JSON.stringify(items),before);assert.equal(result[0],items[1]);
assert.deepEqual(prioritize4kStreams(result),result,'Repeated progressive renders remain stable');
const text=fs.readFileSync(new URL('../js/ui/screens/stream/streamScreen.js',import.meta.url),'utf8');
const start=text.indexOf('function sortStreamsByAddonOrder('),end=text.indexOf('\n/**',start);
let legacy=true;
const sort=vm.runInNewContext(text.slice(start,end)+';sortStreamsByAddonOrder;',{
  supportsUj630Performance:()=>legacy,prioritize4kStreams,
  orderStreamsByAddonOrder:x=>x,priorizarMp4:x=>x,DebridStreamPresentation:{isDirectDebrid:()=>false}});
assert.deepEqual(sort(items).map(x=>x.id),['b','d','f','a','c','e']);
legacy=false;assert.equal(sort(items),items,'Other TV engines keep their existing sort');
console.log('PASS 4K/2160p/UHD recognition, stable partition, explicit resolution, no URL inspection and LG-only integration.');
const ast=parse(text,{ecmaVersion:'latest',sourceType:'module'});
const functions=['captureUjStreamFocus','restoreUjStreamFocus'].map(name=>{
  const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
  return text.slice(n.start,n.end);
}).join('\n');
legacy=true;
const focus=vm.runInNewContext(functions+';({capture:captureUjStreamFocus,restore:restoreUjStreamFocus})',{
  supportsUj630Performance:()=>legacy,streamMergeKey:x=>x.id});
const screen={focusState:{zone:'card',row:0,action:'play'},streams:[items[0]],getFilteredStreams(){return prioritize4kStreams(this.streams)}};
const identity=focus.capture(screen);screen.streams=items;focus.restore(screen,identity);
assert.equal(screen.getFilteredStreams()[screen.focusState.row].id,'a','A late 4K result must not change the selected file');
assert.equal(screen.focusState.action,'play');
screen.focusState={zone:'filter',index:0};assert.equal(focus.capture(screen),null);
focus.restore(screen,identity);assert.equal(screen.focusState.zone,'filter');
legacy=false;screen.focusState={zone:'card',row:0};assert.equal(focus.capture(screen),null);
console.log('PASS selected-file identity survives new 4K arrivals and filter focus remains untouched.');
