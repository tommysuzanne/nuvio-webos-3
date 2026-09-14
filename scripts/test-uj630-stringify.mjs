import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
import {createRequire} from 'node:module'; import {wrapLegacyNativeJson} from './legacyNativeJson.mjs';
const require=createRequire(import.meta.url),ctx=vm.createContext({supportsUj630Performance:()=>true});
vm.runInContext('Symbol=undefined;var nativeCalls=0;var original=JSON.stringify;JSON.stringify=function(v,r){nativeCalls++;return original(v,r)};',ctx);
vm.runInContext(wrapLegacyNativeJson(fs.readFileSync(require.resolve('core-js-bundle/minified.js'),'utf8')),ctx);
vm.runInContext(fs.readFileSync('js/core/util/stringifyStoredData.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,''),ctx);
const cases=['null','undefined','NaN','Infinity','-0','[1,undefined,NaN,"Café","🎬",true]','({a:undefined,b:new Date(0),c:new Number(4),d:/x/})',
  '({a:Symbol("hidden"),b:[Symbol("x")],c:Object(Symbol("box"))})','({[Symbol("key")]:1,x:2})','({toJSON:function(){return {x:2}}})',
  '({surrogates:"\\uD800\\uD800x\\uDC00\\uDC00\\uD834\\uDD1E",quote:"\\\"\\\\"})','JSON.parse(\'{"__proto__":{"x":1}}\')',
  '({large:JSON.rawJSON("9007199254740993")})'];
for(const expression of cases){const result=vm.runInContext('var value='+expression+';[stringifyStoredData(value),JSON.stringify(value)]',ctx);assert.equal(result[0],result[1],expression)}
vm.runInContext('var cyclic={};cyclic.self=cyclic;',ctx);assert.throws(()=>vm.runInContext('stringifyStoredData(cyclic)',ctx));
vm.runInContext('nativeCalls=0;stringifyStoredData({collections:Array.from({length:300},function(_,i){return {id:i,title:"Français"}})});',ctx);
assert.equal(vm.runInContext('nativeCalls',ctx),1,'one native pass for a storage DTO');
console.log('PASS real core-js without native Symbol: storage serialization, symbols, raw JSON fallback, dates, coercion, surrogates, cycles and native fast path.');
