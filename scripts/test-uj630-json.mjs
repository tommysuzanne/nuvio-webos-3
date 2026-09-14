import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import {wrapLegacyNativeJson} from './legacyNativeJson.mjs';
const require=createRequire(import.meta.url);const bundle=fs.readFileSync(require.resolve('core-js-bundle/minified.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(`var nativeCalls=0,baseParse=JSON.parse;JSON.parse=function(t,r){nativeCalls++;return baseParse(t,r)};Symbol=undefined;`,context);
vm.runInContext(wrapLegacyNativeJson(bundle),context);
vm.runInContext('nativeCalls=0;',context);
const cases=['null','true','[1,"français",false]','{"__proto__":{"polluted":true},"x":2}','-0','"\\uD834\\uDD1E"','9007199254740993','{"duplicate":1,"duplicate":2}'];
for(const text of cases){context.input=text;assert.equal(vm.runInContext('JSON.stringify(JSON.parse(input))',context),JSON.stringify(JSON.parse(text)));}
assert.equal(vm.runInContext('nativeCalls',context),cases.length,'ordinary strings must reach native parser even without native Symbol');
for(const text of ['{"x":}','[1,]','01','NaN','"\\x"']){context.input=text;assert.throws(()=>vm.runInContext('JSON.parse(input)',context));}
assert.equal(vm.runInContext(`JSON.parse('9007199254740993',function(k,v,c){return k===''?c.source:v})`,context),'9007199254740993','reviver source support preserved');
assert.equal(vm.runInContext(`JSON.parse({toString:function(){return '12'}})`,context),12,'non-string coercion retained');
assert.equal(vm.runInContext(`({}).polluted`,context),undefined);
assert.equal(vm.runInContext(`1/JSON.parse('-0')`,context),-Infinity);
console.log('PASS legacy native JSON strings, reviver source, coercion, invalid JSON, prototype isolation and signed zero');
